import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, Input, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TaskKind, TaskRuntime } from '@models/task.model';
import type {
  TaskAssetInfoDto,
  TaskEventMsg,
} from '@yinuo-ngm/protocol';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { Subscription } from 'rxjs';
import { TaskStreamService } from '../services/task-stream.service';
import { TasksApiService } from '../services/tasks-api.service';
import { TaskAnalysisDiagnosticsComponent } from './components/task-analysis-diagnostics.component';
import { TaskAnalysisReportComponent } from './components/task-analysis-report.component';
import { TaskAnalysisRuntimeComponent } from './components/task-analysis-runtime.component';
import { TaskAnalysisFacade } from './task-analysis.facade';

@Component({
  selector: 'app-task-analysis',
  standalone: true,
  providers: [TaskAnalysisFacade],
  imports: [
    CommonModule,
    NzEmptyModule,
    NzProgressModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule,
    TaskAnalysisReportComponent,
    TaskAnalysisRuntimeComponent,
    TaskAnalysisDiagnosticsComponent,
  ],
  templateUrl: './task-analysis.component.html',
  styleUrls: ['./task-analysis.component.less'],
})
export class TaskAnalysisComponent implements OnDestroy {
  private api = inject(TasksApiService);
  private stream = inject(TaskStreamService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private clipboard = inject(Clipboard);
  private facade = inject(TaskAnalysisFacade);
  private loadSub?: Subscription;
  private loadScheduled = false;
  private renderScheduled = false;

  readonly formatSizeFn = this.facade.formatSize.bind(this.facade);
  readonly formatRatioFn = this.facade.formatRatio.bind(this.facade);
  readonly formatTimeFn = this.facade.formatTime.bind(this.facade);
  readonly formatMsFn = this.facade.formatMs.bind(this.facade);
  readonly sizeLevelFn = this.facade.sizeLevel.bind(this.facade);
  readonly getTypeColorFn = this.facade.getTypeColor.bind(this.facade);
  readonly getTypeIconFn = this.facade.getTypeIcon.bind(this.facade);
  readonly trackByModPathFn = (index: number, item: { path?: string; name: string }) => this.trackByModPath(index, item);
  readonly trackByAssetPathFn = (index: number, item: TaskAssetInfoDto) => this.trackByAssetPath(index, item);

  copiedUrl = '';

  @Input()
  set taskId(value: string | null | undefined) {
    const next = (value ?? '').trim();
    if (next === this.facade.taskId) return;
    this.updateView(() => this.facade.setTaskId(next));
    this.scheduleLoad();
  }

  get taskId() {
    return this.facade.taskId;
  }

  @Input()
  set taskKind(value: TaskKind | undefined | null) {
    this.updateView(() => this.facade.setTaskKind(value ?? undefined));
  }

  @Input()
  set runtime(value: TaskRuntime | undefined | null) {
    this.updateView(() => this.facade.setRuntime(value ?? null));
  }

  constructor() {
    this.cdr.detach();
    this.stream
      .events$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onTaskEvent(event));
    this.scheduleRender();
  }

  get report() {
    return this.facade.report();
  }

  get diagnostics() {
    return this.facade.diagnostics();
  }

  get history() {
    return this.facade.history();
  }

  get historyError() {
    return this.facade.historyError();
  }

  get runtimeSnapshot() {
    return this.facade.runtimeSnapshot();
  }

  get loading() {
    return this.facade.loading();
  }

  get analyzing() {
    return this.facade.analyzing();
  }

  get error() {
    return this.facade.error();
  }

  get topAssets() {
    return this.facade.topAssets();
  }

  get assets() {
    return this.facade.assets();
  }

  get assetViewportHeight() {
    return this.facade.assetViewportHeight();
  }

  get useVirtualAssetTable() {
    return this.facade.useVirtualAssetTable();
  }

  get statsChunks() {
    return this.facade.statsChunks();
  }

  get statsDependencies() {
    return this.facade.statsDependencies();
  }

  get statsModules() {
    return this.facade.statsModules();
  }

  get insightGroups() {
    return this.facade.insightGroups();
  }

  get diagnosticInsights() {
    return this.facade.diagnosticInsights();
  }

  get diagnosticInsightCount() {
    return this.facade.diagnosticInsightCount();
  }

  get historyRows() {
    return this.facade.historyRows();
  }

  get historyDeltaItems() {
    return this.facade.historyDeltaItems();
  }

  get emptyText() {
    return this.facade.emptyText();
  }

  get showRuntimeAnalysis() {
    return this.facade.showRuntimeAnalysis();
  }

  get runtimeUrls() {
    return this.facade.runtimeUrls();
  }

  get treemapCells() {
    return this.facade.treemapCells();
  }

  refresh() {
    this.load();
  }

  formatSize(size?: number): string {
    return this.facade.formatSize(size);
  }

  formatRatio(value?: number): string {
    return this.facade.formatRatio(value);
  }

  formatTime(value?: number): string {
    return this.facade.formatTime(value);
  }

  formatMs(value?: number): string {
    return this.facade.formatMs(value);
  }

  sizeLevel(size?: number): string {
    return this.facade.sizeLevel(size);
  }

  getTypeColor(type: string): string {
    return this.facade.getTypeColor(type);
  }

  getTypeIcon(type: string): string {
    return this.facade.getTypeIcon(type);
  }

  copyUrl(url: string) {
    if (this.clipboard.copy(url)) {
      this.copiedUrl = url;
      setTimeout(() => {
        if (this.copiedUrl === url) this.copiedUrl = '';
      }, 2000);
    }
  }

  trackByAssetPath(_: number, item: TaskAssetInfoDto): string {
    return item.relativePath;
  }

  trackByModPath(index: number, item: { path?: string; name: string }): string {
    return `${item.path || item.name}:${index}`;
  }

  ngOnDestroy() {
    this.loadSub?.unsubscribe();
  }

  private updateView(update: () => void) {
    update();
    this.scheduleRender();
  }

  private scheduleRender() {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    setTimeout(() => {
      this.renderScheduled = false;
      if (this.destroyRef.destroyed) return;
      this.cdr.detectChanges();
    }, 0);
  }

  private scheduleLoad() {
    if (this.loadScheduled) return;
    this.loadScheduled = true;
    setTimeout(() => {
      this.loadScheduled = false;
      if (this.destroyRef.destroyed) return;
      this.load();
    }, 0);
  }

  private onTaskEvent(event: TaskEventMsg) {
    const payload = event.payload as { taskId?: string; error?: string };
    if (!this.facade.taskId || payload.taskId !== this.facade.taskId) return;

    if (event.type === 'analyzeStarted') {
      this.updateView(() => {
        this.facade.setAnalyzing(true);
        this.facade.setDiagnostics([]);
        this.facade.setError('');
      });
      return;
    }

    if (event.type === 'analyzeFinished') {
      this.updateView(() => this.facade.setAnalyzing(false));
      this.load();
      return;
    }

    if (event.type === 'analyzeFailed') {
      this.updateView(() => {
        this.facade.setAnalyzing(false);
        this.facade.setError(payload.error || '分析失败');
      });
    }
  }

  private load() {
    this.loadSub?.unsubscribe();
    if (!this.facade.taskId) {
      this.updateView(() => this.facade.setLoading(false));
      return;
    }

    this.updateView(() => {
      this.facade.setLoading(true);
      this.facade.setError('');
    });
    this.loadSub = this.api.getLatestReport(this.facade.taskId).subscribe({
      next: (report) => {
        this.updateView(() => {
          this.facade.setReport(report);
          this.facade.setDiagnostics(report?.diagnostics ?? []);
          this.facade.setLoading(false);
        });
        if (!report) this.loadDiagnostics();
        this.loadHistory();
      },
      error: (e) => {
        this.updateView(() => {
          this.facade.setError(e?.message || '加载分析报告失败');
          this.facade.setLoading(false);
        });
      },
    });
  }

  private loadDiagnostics() {
    if (!this.facade.taskId) return;
    this.api.getLatestDiagnostics(this.facade.taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (diagnostics) => {
          this.updateView(() => this.facade.setDiagnostics(diagnostics ?? []));
        },
        error: () => {
          this.updateView(() => this.facade.setDiagnostics([]));
        },
      });
  }

  private loadHistory() {
    if (!this.facade.taskId) return;
    this.api.getReportSummariesByTask(this.facade.taskId, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.updateView(() => {
            this.facade.setHistory(history ?? []);
            this.facade.setHistoryError('');
          });
        },
        error: (e) => {
          this.updateView(() => {
            this.facade.setHistory([]);
            this.facade.setHistoryError(e?.message || '历史趋势加载失败');
          });
        },
      });
  }
}
