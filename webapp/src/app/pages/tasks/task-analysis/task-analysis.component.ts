import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TaskKind, TaskRuntime } from '@models/task.model';
import type { TaskEventMsg } from '@yinuo-ngm/protocol';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
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
    NzTagModule,
    NzIconModule,
    TaskAnalysisReportComponent,
    TaskAnalysisRuntimeComponent,
    TaskAnalysisDiagnosticsComponent,
  ],
  templateUrl: './task-analysis.component.html',
  styleUrls: ['./task-analysis.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAnalysisComponent {
  private api = inject(TasksApiService);
  private stream = inject(TaskStreamService);
  private destroyRef = inject(DestroyRef);
  private facade = inject(TaskAnalysisFacade);
  private loadSub?: Subscription;
  private loadScheduled = false;

  @Input()
  set taskId(value: string | null | undefined) {
    const next = (value ?? '').trim();
    if (next === this.facade.taskId) return;
    this.facade.setTaskId(next);
    this.scheduleLoad();
  }

  get taskId() {
    return this.facade.taskId;
  }

  @Input()
  set taskKind(value: TaskKind | undefined | null) {
    this.facade.setTaskKind(value ?? undefined);
  }

  @Input()
  set runtime(value: TaskRuntime | undefined | null) {
    this.facade.setRuntime(value ?? null);
  }

  readonly report = this.facade.report;
  readonly diagnostics = this.facade.diagnostics;
  readonly history = this.facade.history;
  readonly historyError = this.facade.historyError;
  readonly runtimeSnapshot = this.facade.runtimeSnapshot;
  readonly loading = this.facade.loading;
  readonly analyzing = this.facade.analyzing;
  readonly error = this.facade.error;
  readonly topAssets = this.facade.topAssets;
  readonly assets = this.facade.assets;
  readonly assetViewportHeight = this.facade.assetViewportHeight;
  readonly useVirtualAssetTable = this.facade.useVirtualAssetTable;
  readonly statsChunks = this.facade.statsChunks;
  readonly statsDependencies = this.facade.statsDependencies;
  readonly statsModules = this.facade.statsModules;
  readonly insightGroups = this.facade.insightGroups;
  readonly analyzerDiagnostics = this.facade.analyzerDiagnostics;
  readonly analyzerDiagnosticCount = this.facade.analyzerDiagnosticCount;
  readonly historyRows = this.facade.historyRows;
  readonly historyDeltaItems = this.facade.historyDeltaItems;
  readonly emptyText = this.facade.emptyText;
  readonly showRuntimeAnalysis = this.facade.showRuntimeAnalysis;
  readonly runtimeUrls = this.facade.runtimeUrls;
  readonly treemapCells = this.facade.treemapCells;

  constructor() {
    this.stream
      .events$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onTaskEvent(event));
  }

  refresh() {
    this.load();
  }

  ngOnDestroy() {
    this.loadSub?.unsubscribe();
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
      this.facade.onAnalyzeStarted();
      return;
    }

    if (event.type === 'analyzeFinished') {
      this.facade.onAnalyzeFinished();
      this.load();
      return;
    }

    if (event.type === 'analyzeFailed') {
      this.facade.onAnalyzeFailed(payload.error || '分析失败');
    }
  }

  private load() {
    this.loadSub?.unsubscribe();
    if (!this.facade.taskId) {
      this.facade.onReportLoaded(null);
      return;
    }

    this.facade.loading.set(true);
    this.facade.error.set('');
    this.loadSub = this.api.getLatestReport(this.facade.taskId).subscribe({
      next: (report) => {
        this.facade.onReportLoaded(report);
        if (!report) this.loadDiagnostics();
        this.loadHistory();
      },
      error: (e) => {
        this.facade.onLoadError(e?.message || '加载分析报告失败');
      },
    });
  }

  private loadDiagnostics() {
    if (!this.facade.taskId) return;
    this.api.getLatestDiagnostics(this.facade.taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (diagnostics) => this.facade.onDiagnosticsLoaded(diagnostics ?? []),
        error: () => this.facade.onDiagnosticsLoaded([]),
      });
  }

  private loadHistory() {
    if (!this.facade.taskId) return;
    this.api.getReportSummariesByTask(this.facade.taskId, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => this.facade.onHistoryLoaded(history ?? []),
        error: (e) => this.facade.onHistoryError(e?.message || '历史趋势加载失败'),
      });
  }
}
