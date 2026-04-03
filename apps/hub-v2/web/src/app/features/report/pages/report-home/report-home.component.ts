import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, from, map, mergeMap, of, toArray } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { PageHeaderComponent } from '@shared/ui';
import { BlockRendererComponent } from '../../components/block-renderer/block-renderer.component';
import type {
  AiReportPreviewResult,
  ReportBlock,
  ReportTemplate,
  ReportTemplateExecuteResult,
} from '../../models/report.model';
import { ReportApiService } from '../../services/report-api.service';
import { ReportBoardStore } from '../../services/report-board.store';
import { ReportBoardPanelComponent } from '../../components/report-board-panel/report-board-panel.component';
import { ReportTemplateSidebarComponent } from '../../components/report-template-sidebar/report-template-sidebar.component';

type BulkRenderResult =
  | {
      success: true;
      template: ReportTemplate;
      res: ReportTemplateExecuteResult;
    }
  | {
      success: false;
      template: ReportTemplate;
    };

@Component({
  selector: 'app-report-home-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzSpinModule,
    PageHeaderComponent,
    BlockRendererComponent,
    ReportBoardPanelComponent,
    ReportTemplateSidebarComponent,
  ],
  templateUrl: './report-home.component.html',
  styleUrl: './report-home.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportHomePageComponent {
  private readonly api = inject(ReportApiService);
  private readonly boardStore = inject(ReportBoardStore);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');

  readonly preview = signal<AiReportPreviewResult | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly templateTitle = signal('');
  readonly templates = signal<ReportTemplate[]>([]);
  readonly templatesLoading = signal(false);
  readonly executingTemplateId = signal<string | null>(null);
  readonly renamingTemplateId = signal<string | null>(null);
  readonly activeTemplateId = signal<string | null>(null);
  readonly editingTemplateId = signal<string | null>(null);
  readonly editingTitle = signal('');
  readonly lastNaturalQuery = signal('');
  readonly boardItems = this.boardStore.boardItems;
  readonly boardExecutingTemplateId = signal<string | null>(null);
  readonly bulkRendering = signal(false);
  readonly failedBulkTemplateIds = this.boardStore.failedTemplateIds;

  readonly suggestionQueries: ReadonlyArray<string> = [
    '最近 30 天各项目的测试单创建与关闭趋势',
    '各项目当前成员数量对比',
    '最近 30 天各项目研发项完成情况',
    '成员维度：最近 30 天成员处理数量排行',
  ];

  readonly canGenerate = computed(() => this.query().trim().length >= 2);
  readonly canSaveTemplate = computed(() => {
    return (
      Boolean(this.preview()) &&
      this.templateTitle().trim().length > 0 &&
      this.lastNaturalQuery().trim().length > 0 &&
      !this.saving()
    );
  });
  readonly retryableFailedTemplates = computed(() => {
    const failedIdSet = new Set(this.failedBulkTemplateIds());
    return this.templates().filter((item) => failedIdSet.has(item.id));
  });
  readonly previewBlocks = computed(() => {
    const current = this.preview();
    if (!current) {
      return [] as ReportBlock[];
    }
    const blocks = (current.blocks || []).filter((item): item is ReportBlock => !!item);
    if (blocks.length > 0) {
      return blocks;
    }
    return current.block ? [current.block] : [];
  });

  constructor() {
    this.loadTemplates();
  }

  useSuggestion(value: string): void {
    this.query.set(value);
    this.generate();
  }

  generate(): void {
    const normalized = this.query().trim();
    if (normalized.length < 2 || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.activeTemplateId.set(null);
    this.executingTemplateId.set(null);

    this.api
      .preview({ query: normalized })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.preview.set(res);
          this.lastNaturalQuery.set(normalized);
          this.templateTitle.set((res.title || normalized).trim().slice(0, 120));
        },
        error: () => {
          this.message.error('生成报表失败，请稍后重试');
        },
      });
  }

  saveTemplate(): void {
    const current = this.preview();
    const title = this.templateTitle().trim();
    const naturalQuery = this.lastNaturalQuery().trim();
    if (!current || !title || !naturalQuery || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.api
      .createTemplate({
        title,
        naturalQuery,
        sql: current.sql,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (result) => {
          const entity = result.template;
          this.activeTemplateId.set(entity.id);
          if (result.duplicated) {
            this.message.warning('已存在同名同SQL模板，已定位到现有模板');
          } else {
            this.message.success('模板已保存');
          }
          this.loadTemplates(true);
        },
        error: () => {
          this.message.error('保存模板失败');
        },
      });
  }

  executeTemplate(template: ReportTemplate): void {
    if (this.executingTemplateId() === template.id || this.editingTemplateId() === template.id) {
      return;
    }

    this.executingTemplateId.set(template.id);
    this.api
      .executeTemplate(template.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.executingTemplateId.set(null)),
      )
      .subscribe({
        next: (res) => {
          const resolvedBlocks = (res.blocks && res.blocks.length > 0 ? res.blocks : [res.block]).filter(
            (item): item is ReportBlock => !!item,
          );
          this.preview.set({
            sql: res.sql,
            params: res.params,
            title: res.template.title,
            description: '',
            caliber: res.caliber,
            blocks: resolvedBlocks,
            block: resolvedBlocks[0] || res.block,
          });
          this.query.set(res.template.naturalQuery);
          this.lastNaturalQuery.set(res.template.naturalQuery);
          this.templateTitle.set(res.template.title);
          this.activeTemplateId.set(res.template.id);
        },
        error: () => {
          this.message.error('执行模板失败');
        },
      });
  }

  loadTemplates(silent = false): void {
    if (!silent) {
      this.templatesLoading.set(true);
    }
    this.api
      .listTemplates()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.templatesLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.templates.set(res.items || []);
        },
        error: () => {
          this.templates.set([]);
          if (!silent) {
            this.message.error('加载模板失败');
          }
        },
      });
  }

  startRename(template: ReportTemplate, event?: Event): void {
    this.stopEvent(event);
    this.editingTemplateId.set(template.id);
    this.editingTitle.set(template.title);
  }

  cancelRename(event?: Event): void {
    this.stopEvent(event);
    this.editingTemplateId.set(null);
    this.editingTitle.set('');
  }

  confirmRename(templateId: string, event?: Event): void {
    this.stopEvent(event);
    const title = this.editingTitle().trim();
    if (!title) {
      this.message.warning('模板名称不能为空');
      return;
    }
    if (this.renamingTemplateId() === templateId) {
      return;
    }

    this.renamingTemplateId.set(templateId);
    this.api
      .updateTemplateTitle(templateId, title)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.renamingTemplateId.set(null)),
      )
      .subscribe({
        next: (entity) => {
          this.templates.update((items) => items.map((item) => (item.id === entity.id ? entity : item)));
          if (this.activeTemplateId() === entity.id) {
            this.templateTitle.set(entity.title);
          }
          this.cancelRename();
          this.message.success('模板已重命名');
        },
        error: () => {
          this.message.error('模板重命名失败');
        },
      });
  }

  deleteTemplate(template: ReportTemplate, event?: Event): void {
    this.stopEvent(event);
    this.api
      .deleteTemplate(template.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.templates.update((items) => items.filter((item) => item.id !== template.id));
          this.boardStore.removeBoardItem(template.id);
          this.boardStore.removeFailedTemplateId(template.id);
          if (this.activeTemplateId() === template.id) {
            this.activeTemplateId.set(null);
          }
          if (this.editingTemplateId() === template.id) {
            this.cancelRename();
          }
          this.message.success('模板已删除');
        },
        error: () => {
          this.message.error('模板删除失败');
        },
      });
  }

  renderTemplateToBoard(template: ReportTemplate, event?: Event): void {
    this.stopEvent(event);
    if (this.boardExecutingTemplateId() === template.id) {
      return;
    }

    this.boardExecutingTemplateId.set(template.id);
    this.api
      .executeTemplate(template.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.boardExecutingTemplateId.set(null)),
      )
      .subscribe({
        next: (res) => {
          const boardBlocks = (res.blocks && res.blocks.length > 0 ? res.blocks : [res.block]).filter(
            (item): item is ReportBlock => !!item,
          );
          this.boardStore.upsertBoardItem({
            id: res.template.id,
            title: res.template.title,
            naturalQuery: res.template.naturalQuery,
            sql: res.sql,
            params: res.params,
            blocks: boardBlocks,
          });
          this.boardStore.removeFailedTemplateId(template.id);
          this.message.success('已加入看板');
        },
        error: () => {
          this.message.error('加入看板失败');
        },
      });
  }

  renderAllTemplates(): void {
    const templates = this.templates();
    if (templates.length === 0 || this.bulkRendering()) {
      return;
    }
    this.executeTemplatesToBoard(templates);
  }

  retryFailedTemplates(): void {
    const templates = this.retryableFailedTemplates();
    if (templates.length === 0 || this.bulkRendering()) {
      return;
    }
    this.executeTemplatesToBoard(templates);
  }

  clearBoard(): void {
    this.boardStore.clearBoard();
  }

  removeBoardItem(id: string): void {
    this.boardStore.removeBoardItem(id);
    this.boardStore.removeFailedTemplateId(id);
  }

  toggleBoardItemLayout(id: string): void {
    this.boardStore.toggleBoardItemLayout(id);
  }

  moveBoardItem(sourceId: string, targetId: string): void {
    this.boardStore.moveBoardItem(sourceId, targetId);
  }

  private executeTemplatesToBoard(templates: ReportTemplate[]): void {
    this.bulkRendering.set(true);
    const concurrency = 4;

    from(templates)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        mergeMap(
          (template) =>
            this.api.executeTemplate(template.id).pipe(
              map((res) => ({ success: true as const, template, res })),
              catchError(() => of({ success: false as const, template })),
            ),
          concurrency,
        ),
        toArray(),
        finalize(() => this.bulkRendering.set(false)),
      )
      .subscribe({
        next: (results) => {
          let successCount = 0;
          const failedTemplates: ReportTemplate[] = [];

          for (const item of results as BulkRenderResult[]) {
            if (item.success) {
              successCount += 1;
              const boardBlocks = (item.res.blocks && item.res.blocks.length > 0 ? item.res.blocks : [item.res.block]).filter(
                (block): block is ReportBlock => !!block,
              );
              this.boardStore.upsertBoardItem({
                id: item.res.template.id,
                title: item.res.template.title,
                naturalQuery: item.res.template.naturalQuery,
                sql: item.res.sql,
                params: item.res.params,
                blocks: boardBlocks,
              });
              continue;
            }
            failedTemplates.push(item.template);
          }
          this.boardStore.setFailedTemplateIds(failedTemplates.map((item) => item.id));

          if (failedTemplates.length === 0) {
            this.message.success(`已渲染 ${successCount} 个模板`);
            return;
          }

          const failedCount = failedTemplates.length;
          const sampleNames = failedTemplates
            .slice(0, 3)
            .map((item) => item.title)
            .join('、');
          const nameSuffix = failedCount > 3 ? ` 等 ${failedCount} 个` : '';

          if (successCount > 0) {
            this.message.warning(`已渲染 ${successCount} 个模板，${failedCount} 个失败（${sampleNames}${nameSuffix}）`);
            return;
          }

          this.message.error(`模板渲染失败（${sampleNames}${nameSuffix}）`);
        },
        error: () => {
          this.boardStore.setFailedTemplateIds(templates.map((item) => item.id));
          this.message.error('模板渲染失败');
        },
      });
  }

  private stopEvent(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
  }

  protected isCompactBlock(block: ReportBlock): boolean {
    return block.type === 'distribution_chart' && (block.chart?.type === 'pie' || block.chart?.type === 'donut');
  }

  protected isFullWidthBlock(block: ReportBlock): boolean {
    return block.type === 'table';
  }
}
