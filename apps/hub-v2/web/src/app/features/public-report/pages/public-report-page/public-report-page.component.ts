import { CommonModule } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { BlockRendererComponent } from '../../../report/components/block-renderer/block-renderer.component';
import type { ReportBlock } from '../../../report/models/report.model';
import { PublicReportApiService } from '../../services/public-report-api.service';
import { PublicReportStore } from '../../store/public-report.store';

@Component({
  selector: 'app-public-report-page',
  standalone: true,
  imports: [
    CommonModule,
    ClipboardModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzRadioModule,
    NzSelectModule,
    NzSpinModule,
    BlockRendererComponent,
  ],
  templateUrl: './public-report-page.component.html',
  styleUrl: './public-report-page.component.less',
  providers: [PublicReportStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicReportPageComponent {
  private readonly api = inject(PublicReportApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(PublicReportStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);

  readonly query = this.store.query;
  readonly share = this.store.share;
  readonly projects = this.store.projects;
  readonly selectedProjectId = this.store.selectedProjectId;
  readonly loadingProjects = this.store.loadingProjects;
  readonly loadingPreview = this.store.loadingPreview;
  readonly loadingBoard = this.store.loadingBoard;
  readonly preview = this.store.preview;
  readonly board = this.store.board;
  readonly boardBlocks = this.store.boardBlocks;
  readonly previewBlocks = this.store.previewBlocks;
  readonly projectRangeMode = signal<'all' | 'project'>('all');
  readonly activeView = signal<'dashboard' | 'list'>('dashboard');
  readonly expandedListItemIndexes = signal<number[]>([]);
  readonly copyState = signal<'idle' | 'copied'>('idle');
  readonly suggestionQueries: ReadonlyArray<string> = [
    '最近 30 天各项目的测试单创建与关闭趋势',
    '各项目当前成员数量对比',
    '最近 30 天各项目研发项完成情况',
    '成员维度：最近 30 天成员处理数量排行',
  ];

  readonly isBoardMode = computed(() => Boolean(this.board()));

  readonly canGenerate = computed(() => {
    if (this.isBoardMode()) {
      return false;
    }
    const hasQuery = this.query().trim().length >= 2;
    if (!hasQuery || this.loadingPreview()) {
      return false;
    }
    if (this.projectRangeMode() === 'project' && !this.selectedProjectId().trim()) {
      return false;
    }
    return true;
  });

  readonly showProjectSelector = computed(() => this.projects().length > 1);
  readonly shareLink = computed(() => {
    const base = this.getOrigin();
    const share = this.share().trim();
    if (!share) {
      return `${base}/public/report`;
    }
    return `${base}/public/report?share=${encodeURIComponent(share)}`;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const share = (params.get('share') || '').trim();
      this.share.set(share);
      this.loadPageDataByShare();
    });
  }

  switchView(view: 'dashboard' | 'list'): void {
    this.activeView.set(view);
  }

  useSuggestion(value: string): void {
    this.query.set(value);
    this.generate();
  }

  generate(): void {
    const query = this.query().trim();
    if (query.length < 2 || this.loadingPreview()) {
      return;
    }
    const selectedProjectId = this.projectRangeMode() === 'project' ? this.selectedProjectId().trim() : '';

    this.loadingPreview.set(true);
    this.api
      .preview({
        query,
        share: this.share().trim() || undefined,
        projectId: selectedProjectId || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.loadingPreview.set(false);
          this.preview.set(result);
          this.expandedListItemIndexes.set([]);
        },
        error: (error: { error?: { message?: string } }) => {
          this.loadingPreview.set(false);
          this.message.error(error?.error?.message || '生成报表失败，请稍后重试');
        },
      });
  }

  toggleListItem(index: number): void {
    this.expandedListItemIndexes.update((items) => {
      if (items.includes(index)) {
        return items.filter((item) => item !== index);
      }
      return [...items, index];
    });
  }

  copyShareLink(): void {
    const text = this.shareLink();
    const ok = this.clipboard.copy(text);
    if (!ok) {
      this.message.error('复制失败，请手动复制');
      return;
    }
    this.copyState.set('copied');
    setTimeout(() => this.copyState.set('idle'), 1800);
  }

  private loadProjects(): void {
    this.loadingProjects.set(true);
    this.preview.set(null);
    this.api
      .listProjects(this.share().trim() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loadingProjects.set(false);
          const projects = res.items || [];
          this.projects.set(projects);
          if (projects.length <= 1) {
            this.projectRangeMode.set('all');
            this.selectedProjectId.set(projects[0]?.id || '');
            return;
          }
          const currentSelected = this.selectedProjectId().trim();
          const isCurrentValid = projects.some((item) => item.id === currentSelected);
          this.selectedProjectId.set(isCurrentValid ? currentSelected : projects[0].id);
        },
        error: (error: { error?: { message?: string } }) => {
          this.loadingProjects.set(false);
          this.projects.set([]);
          this.selectedProjectId.set('');
          this.message.error(error?.error?.message || '加载公开项目失败');
        },
      });
  }

  private loadPageDataByShare(): void {
    const share = this.share().trim();
    this.preview.set(null);
    this.board.set(null);
    this.expandedListItemIndexes.set([]);
    if (!share) {
      this.loadProjects();
      return;
    }

    this.loadingBoard.set(true);
    this.api
      .getBoard(share)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (board) => {
          this.loadingBoard.set(false);
          this.board.set(board);
          this.projects.set([]);
          this.selectedProjectId.set('');
        },
        error: () => {
          this.loadingBoard.set(false);
          this.board.set(null);
          this.loadProjects();
        },
      });
  }

  protected isCompactBlock(block: ReportBlock): boolean {
    return block.type === 'distribution_chart' && (block.chart?.type === 'pie' || block.chart?.type === 'donut');
  }

  protected isFullWidthBlock(block: ReportBlock): boolean {
    return block.type === 'table';
  }

  protected isListItemExpanded(index: number): boolean {
    return this.expandedListItemIndexes().includes(index);
  }

  protected blockTypeLabel(block: ReportBlock): string {
    const typeMap: Record<string, string> = {
      stat_card: '统计卡片',
      trend_chart: '趋势分析',
      distribution_chart: '分布分析',
      leaderboard: '排行榜',
      table: '数据列表',
      empty: '空数据',
    };
    return typeMap[block.type] || block.type;
  }

  private getOrigin(): string {
    try {
      return globalThis.location.origin;
    } catch {
      return '';
    }
  }
}
