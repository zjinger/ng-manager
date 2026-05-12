import { Injectable, computed, signal } from '@angular/core';
import type { TaskKind, TaskRuntime } from '@models/task.model';
import type {
  TaskAnalyzeDiagnosticDto,
  TaskAnalyzeReportSummaryDto,
  TaskAnalyzeResultDto,
  TaskAssetInfoDto,
} from '@yinuo-ngm/protocol';
import type { AnalysisInsight, InsightCategory, InsightGroup, TreemapCell } from './task-analysis.types';
import { getAssetTypeColor } from '@app/shared';

@Injectable()
export class TaskAnalysisFacade {
  private _taskId = signal('');
  private _taskKind = signal<TaskKind | undefined>(undefined);
  readonly report = signal<TaskAnalyzeResultDto | null>(null);
  readonly diagnostics = signal<TaskAnalyzeDiagnosticDto[]>([]);
  readonly history = signal<TaskAnalyzeReportSummaryDto[]>([]);
  readonly historyError = signal('');
  readonly runtimeSnapshot = signal<TaskRuntime | null>(null);
  readonly loading = signal(false);
  readonly analyzing = signal(false);
  readonly error = signal('');

  readonly topAssets = computed<TaskAssetInfoDto[]>(() => (this.report()?.assets ?? []).slice(0, 8));
  readonly assets = computed<TaskAssetInfoDto[]>(() => {
    const typeOrder: Record<string, number> = {
      js: 0,
      css: 1,
      html: 2,
      image: 3,
      font: 4,
      asset: 5,
      map: 6,
    };
    return [...(this.report()?.assets ?? [])].sort((a, b) => {
      const typeDiff = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      if (typeDiff !== 0) return typeDiff;
      const sizeDiff = (b.rawSize ?? 0) - (a.rawSize ?? 0);
      if (sizeDiff !== 0) return sizeDiff;
      return (a.relativePath ?? a.name ?? '').localeCompare(b.relativePath ?? b.name ?? '');
    });
  });
  readonly assetViewportHeight = computed(() => {
    const len = this.assets().length;
    if (len === 0) return 80;
    return Math.min(360, Math.max(80, len * 40));
  });
  readonly useVirtualAssetTable = computed(() => this.assets().length > 200);
  readonly statsChunks = computed(() => (this.report()?.stats?.chunks ?? []).slice(0, 8));
  readonly statsDependencies = computed(() => (this.report()?.stats?.dependencies ?? []).slice(0, 8));
  readonly statsModules = computed(() => (this.report()?.stats?.modules ?? []).slice(0, 10));
  readonly statsInsights = computed(() => {
    const report = this.report();
    const insights = report?.stats?.insights ?? [];
    const statsJsonCleaned = (report?.warnings ?? []).some((warning) => warning.code === 'stats-json-cleaned');
    const hasStatsJsonAsset = (report?.assets ?? []).some((asset) => asset.name === 'stats.json');
    if (!statsJsonCleaned && hasStatsJsonAsset) return insights;
    return insights.filter((insight) => insight.code !== 'deployment-stats-json');
  });
  readonly reportWarningsAsInsights = computed(() =>
    (this.report()?.warnings ?? [])
      .filter((warning) => warning.code !== 'stats-json-cleaned')
      .map((warning) => ({
        level: 'warning' as const,
        code: `warning:${warning.code}`,
        message: warning.message,
        category: warning.code === 'stats-json-cleanup-failed' ? 'risk' as const : 'diagnostic' as const,
        data: warning.data,
      }))
  );
  readonly analysisInsights = computed(() => {
    const priority = new Map<string, number>([
      ['risk', 0],
      ['budget', 1],
      ['optimization', 2],
      ['migration', 3],
      ['diagnostic', 4],
    ]);
    return this.uniqueInsights([...this.reportWarningsAsInsights(), ...this.statsInsights()])
      .sort((a, b) => (priority.get(a.category ?? 'diagnostic') ?? 4) - (priority.get(b.category ?? 'diagnostic') ?? 4));
  });
  readonly buildInsights = computed<AnalysisInsight[]>(() =>
    this.analysisInsights().filter((insight) => (insight.category ?? 'diagnostic') !== 'diagnostic')
  );
  readonly insightGroups = computed<InsightGroup[]>(() => {
    const categories: InsightCategory[] = ['risk', 'budget', 'optimization', 'migration'];
    return categories
      .map((category) => ({
        category,
        label: this.insightLabel(category),
        items: this.buildInsights().filter((insight) => (insight.category ?? 'diagnostic') === category),
      }))
      .filter((group) => group.items.length > 0);
  });
  readonly analyzerDiagnostics = computed(() => this.diagnostics());
  readonly analyzerDiagnosticCount = computed(() => this.analyzerDiagnostics().length);
  readonly historyRows = computed(() => this.history().slice(0, 10));
  readonly previousHistory = computed(() => {
    const currentRunId = this.report()?.runId;
    const rows = this.historyRows();
    if (!currentRunId) return rows[1] ?? rows[0] ?? null;
    return rows.find((item) => item.runId !== currentRunId) ?? null;
  });
  readonly rawDelta = computed(() => {
    const prev = this.previousHistory();
    const cur = this.report()?.summary;
    if (!prev || !cur) return null;
    return cur.totalRawSize - prev.totalRawSize;
  });
  readonly gzipDelta = computed(() => {
    const prev = this.previousHistory();
    const cur = this.report()?.summary;
    if (!prev || !cur) return null;
    return cur.totalGzipSize - prev.totalGzipSize;
  });
  readonly durationDelta = computed(() => {
    const prev = this.previousHistory();
    const cur = this.report()?.summary;
    if (!prev || !cur || typeof cur.durationMs !== 'number' || typeof prev.durationMs !== 'number') return null;
    return cur.durationMs - prev.durationMs;
  });
  readonly historyDeltaItems = computed(() => {
    const rawDelta = this.rawDelta();
    const gzipDelta = this.gzipDelta();
    const durationDelta = this.durationDelta();
    return [
      { label: 'Raw', value: this.formatDeltaSize(rawDelta), className: this.deltaClass(rawDelta) },
      { label: 'Gzip', value: this.formatDeltaSize(gzipDelta), className: this.deltaClass(gzipDelta) },
      { label: 'Duration', value: this.formatDeltaMs(durationDelta), className: this.deltaClass(durationDelta) },
    ];
  });
  readonly emptyText = computed(() => {
    if (this.loading() || this.analyzing()) return '正在加载分析报告...';
    return this.error() || '暂无分析报告，build 成功后会自动生成。';
  });
  readonly showRuntimeAnalysis = computed(() => this._taskKind() === 'serve');
  readonly runtimeUrls = computed(() => this.runtimeSnapshot()?.urls ?? []);
  readonly treemapCells = computed<TreemapCell[]>(() => {
    const allAssets = this.report()?.assets ?? [];
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
        color: getAssetTypeColor(asset.type),
      });
    }
    const currentTotal = cells.reduce((sum, c) => sum + c.colSpan, 0);
    if (currentTotal > totalCells && cells.length > 0) {
      const diff = currentTotal - totalCells;
      cells[cells.length - 1].colSpan = Math.max(1, cells[cells.length - 1].colSpan - diff);
    }
    return cells;
  });

  get taskId() {
    return this._taskId();
  }

  setTaskId(value: string) {
    if (value === this._taskId()) return;
    this._taskId.set(value);
    this.report.set(null);
    this.diagnostics.set([]);
    this.history.set([]);
    this.historyError.set('');
    this.error.set('');
    this.loading.set(false);
    this.analyzing.set(false);
  }

  setTaskKind(value: TaskKind | undefined) {
    this._taskKind.set(value);
  }

  setRuntime(value: TaskRuntime | null) {
    this.runtimeSnapshot.set(value);
  }

  onReportLoaded(report: TaskAnalyzeResultDto | null, diagnostics?: TaskAnalyzeDiagnosticDto[]) {
    this.report.set(report);
    this.diagnostics.set(diagnostics ?? report?.diagnostics ?? []);
    this.loading.set(false);
  }

  onLoadError(message: string) {
    this.error.set(message);
    this.loading.set(false);
  }

  onAnalyzeStarted() {
    this.analyzing.set(true);
    this.diagnostics.set([]);
    this.error.set('');
  }

  onAnalyzeFinished() {
    this.analyzing.set(false);
  }

  onAnalyzeFailed(message: string) {
    this.analyzing.set(false);
    this.error.set(message);
  }

  onHistoryLoaded(history: TaskAnalyzeReportSummaryDto[]) {
    this.history.set(history ?? []);
    this.historyError.set('');
  }

  onHistoryError(message: string) {
    this.history.set([]);
    this.historyError.set(message);
  }

  onDiagnosticsLoaded(diagnostics: TaskAnalyzeDiagnosticDto[]) {
    this.diagnostics.set(diagnostics ?? []);
  }

  formatDeltaSize(value: number | null): string {
    if (value === null) return '-';
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (abs < 1024) return `${prefix}${abs} B`;
    if (abs < 1024 * 1024) return `${prefix}${(abs / 1024).toFixed(1)} KB`;
    return `${prefix}${(abs / 1024 / 1024).toFixed(2)} MB`;
  }

  formatDeltaMs(value: number | null): string {
    if (value === null) return '-';
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    const abs = Math.abs(value);
    return abs >= 1000 ? `${prefix}${(abs / 1000).toFixed(2)}s` : `${prefix}${abs}ms`;
  }

  deltaClass(value: number | null): string {
    if (value === null || value === 0) return 'neutral';
    return value > 0 ? 'up' : 'down';
  }

  private insightLabel(category?: string): string {
    const map: Record<string, string> = {
      risk: '风险',
      optimization: '优化',
      migration: '迁移',
      budget: '预算',
      diagnostic: '诊断',
    };
    return map[category ?? 'diagnostic'] ?? '提示';
  }

  private uniqueInsights(insights: AnalysisInsight[]): AnalysisInsight[] {
    const seen = new Set<string>();
    const result: AnalysisInsight[] = [];
    for (const insight of insights) {
      const key = `${insight.category ?? 'diagnostic'}:${insight.code}:${insight.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(insight);
    }
    return result;
  }
}
