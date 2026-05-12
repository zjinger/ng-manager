import { Clipboard } from '@angular/cdk/clipboard';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, Input, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TaskKind, TaskRuntime } from '@models/task.model';
import type {
  TaskAnalyzeDiagnosticDto,
  TaskAnalyzeReportSummaryDto,
  TaskAnalyzeResultDto,
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

interface TreemapCell {
  name: string;
  relativePath: string;
  size: number;
  ratio: number;
  type: string;
  colSpan: number;
  rowSpan: number;
  color: string;
}

@Component({
  selector: 'app-task-analysis',
  standalone: true,
  imports: [
    CommonModule,
    NzEmptyModule,
    NzProgressModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule,
    ScrollingModule,
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
  private loadSub?: Subscription;
  private _taskId = '';
  private _taskKind: TaskKind | undefined;
  private loadScheduled = false;
  private renderScheduled = false;

  copiedUrl = '';

  @Input()
  set taskId(value: string | null | undefined) {
    const next = (value ?? '').trim();
    if (next === this._taskId) return;
    this.updateView(() => {
      this._taskId = next;
      this.report = null;
      this.diagnostics = [];
      this.history = [];
      this.historyError = '';
      this.error = '';
      this.loading = false;
      this.analyzing = false;
    });
    this.scheduleLoad();
  }

  get taskId() {
    return this._taskId;
  }

  @Input()
  set taskKind(value: TaskKind | undefined | null) {
    this.updateView(() => {
      this._taskKind = value ?? undefined;
    });
  }

  @Input()
  set runtime(value: TaskRuntime | undefined | null) {
    this.updateView(() => {
      this.runtimeSnapshot = value ?? null;
    });
  }

  report: TaskAnalyzeResultDto | null = null;
  diagnostics: TaskAnalyzeDiagnosticDto[] = [];
  history: TaskAnalyzeReportSummaryDto[] = [];
  historyError = '';
  runtimeSnapshot: TaskRuntime | null = null;
  loading = false;
  analyzing = false;
  error = '';

  constructor() {
    this.cdr.detach();
    this.stream
      .events$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onTaskEvent(event));
    this.scheduleRender();
  }

  get topAssets(): TaskAssetInfoDto[] {
    return (this.report?.assets ?? []).slice(0, 8);
  }

  get assets(): TaskAssetInfoDto[] {
    return this.report?.assets ?? [];
  }

  get assetViewportHeight(): number {
    if (this.assets.length === 0) return 80;
    return Math.min(360, Math.max(80, this.assets.length * 40));
  }

  get useVirtualAssetTable(): boolean {
    return this.assets.length > 200;
  }

  get statsChunks() {
    return (this.report?.stats?.chunks ?? []).slice(0, 8);
  }

  get statsDependencies() {
    return (this.report?.stats?.dependencies ?? []).slice(0, 8);
  }

  get statsModules() {
    return (this.report?.stats?.modules ?? []).slice(0, 10);
  }

  get statsInsights() {
    const insights = this.report?.stats?.insights ?? [];
    const statsJsonCleaned = (this.report?.warnings ?? []).some(
      (warning) => warning.code === 'stats-json-cleaned',
    );
    const hasStatsJsonAsset = (this.report?.assets ?? []).some(
      (asset) => asset.name === 'stats.json',
    );
    if (!statsJsonCleaned && hasStatsJsonAsset) return insights;
    return insights.filter((insight) => insight.code !== 'deployment-stats-json');
  }

  get reportWarningsAsInsights() {
    return (this.report?.warnings ?? [])
      .filter((warning) => warning.code !== 'stats-json-cleaned')
      .map((warning) => ({
        level: 'warning' as const,
        code: `warning:${warning.code}`,
        message: warning.message,
        category: warning.code === 'stats-json-cleanup-failed' ? 'risk' as const : 'diagnostic' as const,
        data: warning.data,
      }));
  }

  get analysisInsights() {
    const priority = new Map<string, number>([
      ['risk', 0],
      ['budget', 1],
      ['optimization', 2],
      ['migration', 3],
      ['diagnostic', 4],
    ]);
    return [...this.reportWarningsAsInsights, ...this.statsInsights]
      .sort((a, b) => (priority.get(a.category ?? 'diagnostic') ?? 4) - (priority.get(b.category ?? 'diagnostic') ?? 4));
  }

  get visibleAnalysisInsights() {
    return this.analysisInsights.slice(0, 6);
  }

  get hiddenAnalysisInsightCount() {
    return Math.max(0, this.analysisInsights.length - this.visibleAnalysisInsights.length);
  }

  get diagnosticInsights() {
    return this.diagnostics.map((item, index) => ({
      level: item.status === 'failed' ? 'warning' as const : 'info' as const,
      code: `diagnostic:${item.analyzer}:${item.phase}:${item.status}:${index}`,
      message: this.formatDiagnostic(item),
      category: 'diagnostic' as const,
      data: item.data,
    }));
  }

  get historyRows(): TaskAnalyzeReportSummaryDto[] {
    return this.history.slice(0, 10);
  }

  get previousHistory(): TaskAnalyzeReportSummaryDto | null {
    const currentRunId = this.report?.runId;
    if (!currentRunId) return this.historyRows[1] ?? this.historyRows[0] ?? null;
    return this.historyRows.find((item) => item.runId !== currentRunId) ?? null;
  }

  get rawDelta(): number | null {
    const prev = this.previousHistory;
    const cur = this.report?.summary;
    if (!prev || !cur) return null;
    return cur.totalRawSize - prev.totalRawSize;
  }

  get gzipDelta(): number | null {
    const prev = this.previousHistory;
    const cur = this.report?.summary;
    if (!prev || !cur) return null;
    return cur.totalGzipSize - prev.totalGzipSize;
  }

  get durationDelta(): number | null {
    const prev = this.previousHistory;
    const cur = this.report?.summary;
    if (!prev || !cur || typeof cur.durationMs !== 'number' || typeof prev.durationMs !== 'number') return null;
    return cur.durationMs - prev.durationMs;
  }

  get emptyText(): string {
    if (this.loading || this.analyzing) return '正在加载分析报告...';
    return this.error || '暂无分析报告，build 成功后会自动生成。';
  }

  get showRuntimeAnalysis(): boolean {
    return this._taskKind === 'serve';
  }

  get runtimeUrls(): string[] {
    return this.runtimeSnapshot?.urls ?? [];
  }

  get treemapCells(): TreemapCell[] {
    const allAssets = this.report?.assets ?? [];
    if (!allAssets.length) return [];

    const top = allAssets.slice(0, 20);
    const totalSize = top.reduce((sum, a) => sum + (a.rawSize || 0), 0);
    if (totalSize <= 0) return [];

    const totalCells = 100;
    const cells: TreemapCell[] = [];

    for (const asset of top) {
      const ratio = (asset.rawSize || 0) / totalSize;
      const span = Math.max(1, Math.round(ratio * totalCells));
      cells.push({
        name: asset.name,
        relativePath: asset.relativePath,
        size: asset.rawSize || 0,
        ratio,
        type: asset.type,
        colSpan: span,
        rowSpan: 1,
        color: this.getTypeColor(asset.type),
      });
    }

    // Normalize to fit totalCells
    const currentTotal = cells.reduce((sum, c) => sum + c.colSpan, 0);
    if (currentTotal > totalCells && cells.length > 0) {
      const diff = currentTotal - totalCells;
      cells[cells.length - 1].colSpan = Math.max(1, cells[cells.length - 1].colSpan - diff);
    }

    return cells;
  }

  get gzipSavingsPercent(): string {
    const s = this.report?.summary;
    if (!s?.totalRawSize || !s?.totalGzipSize) return '0%';
    const savings = ((s.totalRawSize - s.totalGzipSize) / s.totalRawSize) * 100;
    return `${savings.toFixed(1)}%`;
  }

  get brotliSavingsPercent(): string {
    const s = this.report?.summary;
    if (!s?.totalRawSize || !s?.totalBrotliSize) return '0%';
    const savings = ((s.totalRawSize - s.totalBrotliSize) / s.totalRawSize) * 100;
    return `${savings.toFixed(1)}%`;
  }

  refresh() {
    this.load();
  }

  formatSize(size?: number): string {
    const value = Number(size ?? 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }

  formatRatio(value?: number): string {
    return `${((value ?? 0) * 100).toFixed(1)}%`;
  }

  formatTime(value?: number): string {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString();
  }

  formatMs(value?: number): string {
    if (typeof value !== 'number') return '-';
    return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
  }

  formatDeltaSize(value: number | null): string {
    if (value === null) return '-';
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${this.formatSize(Math.abs(value))}`;
  }

  formatDeltaMs(value: number | null): string {
    if (value === null) return '-';
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${this.formatMs(Math.abs(value))}`;
  }

  deltaClass(value: number | null): string {
    if (value === null || value === 0) return 'neutral';
    return value > 0 ? 'up' : 'down';
  }

  insightLabel(category?: string): string {
    const map: Record<string, string> = {
      risk: '风险',
      optimization: '优化',
      migration: '迁移',
      budget: '预算',
      diagnostic: '诊断',
    };
    return map[category ?? 'diagnostic'] ?? '提示';
  }

  sizeLevel(size?: number): string {
    const value = Number(size ?? 0);
    if (value > 500 * 1024) return 'danger';
    if (value > 200 * 1024) return 'warning';
    return 'good';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      js: '#1677ff',
      css: '#52c41a',
      html: '#722ed1',
      image: '#fa8c16',
      font: '#13c2c2',
      asset: '#8c8c8c',
    };
    return map[type] || '#d9d9d9';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      js: 'code',
      css: 'bg-colors',
      html: 'html5',
      image: 'picture',
      font: 'font-size',
      asset: 'file',
    };
    return map[type] || 'file';
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

  trackByChunkName(_: number, item: { name: string }): string {
    return item.name;
  }

  trackByDepName(_: number, item: { name: string }): string {
    return item.name;
  }

  trackByModPath(index: number, item: { path?: string; name: string }): string {
    return `${item.path || item.name}:${index}`;
  }

  trackByCellPath(_: number, item: TreemapCell): string {
    return item.relativePath;
  }

  trackByInsight(index: number, item: { code: string }): string {
    return `${item.code}:${index}`;
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
    if (!this._taskId || payload.taskId !== this._taskId) return;

    if (event.type === 'analyzeStarted') {
      this.updateView(() => {
        this.analyzing = true;
        this.diagnostics = [];
        this.error = '';
      });
      return;
    }

    if (event.type === 'analyzeFinished') {
      this.updateView(() => {
        this.analyzing = false;
      });
      this.load();
      return;
    }

    if (event.type === 'analyzeFailed') {
      this.updateView(() => {
        this.analyzing = false;
        this.error = payload.error || '分析失败';
      });
    }
  }

  private load() {
    this.loadSub?.unsubscribe();
    if (!this._taskId) {
      this.updateView(() => {
        this.loading = false;
      });
      return;
    }

    this.updateView(() => {
      this.loading = true;
      this.error = '';
    });
    this.loadSub = this.api.getLatestReport(this._taskId).subscribe({
      next: (report) => {
        this.updateView(() => {
          this.report = report;
          this.diagnostics = report?.diagnostics ?? [];
          this.loading = false;
        });
        if (!report) this.loadDiagnostics();
        this.loadHistory();
      },
      error: (e) => {
        this.updateView(() => {
          this.error = e?.message || '加载分析报告失败';
          this.loading = false;
        });
      },
    });
  }

  private loadDiagnostics() {
    if (!this._taskId) return;
    this.api.getLatestDiagnostics(this._taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (diagnostics) => {
        this.updateView(() => {
          this.diagnostics = diagnostics ?? [];
        });
      },
      error: () => {
        this.updateView(() => {
          this.diagnostics = [];
        });
      },
    });
  }

  private loadHistory() {
    if (!this._taskId) return;
    this.api.getReportSummariesByTask(this._taskId, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.updateView(() => {
            this.history = history ?? [];
            this.historyError = '';
          });
        },
        error: (e) => {
          this.updateView(() => {
            this.history = [];
            this.historyError = e?.message || '历史趋势加载失败';
          });
        },
      });
  }

  private formatDiagnostic(item: TaskAnalyzeDiagnosticDto): string {
    const base = `${item.analyzer}: ${item.status}`;
    return item.message ? `${base}，${item.message}` : base;
  }
}
