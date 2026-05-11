import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ViewChild, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ProjectContextStore } from '@app/core/stores';
import { PageLayoutComponent } from '@app/shared';
import type { TaskAnalyzeResultDto, TaskDashboardDto, TaskViewDefinitionDto, TaskViewIdDto } from '@yinuo-ngm/protocol';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutComponent, NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NodeVersionComponent } from './node-version/node-version.component';
import { TaskStreamService } from './services/task-stream.service';
import { TasksApiService } from './services/tasks-api.service';
import { TaskStateService } from './services/tasks.state.service';
import { TaskActionsComponent } from './task-actions/task-actions.component';
import { TaskAnalysisComponent } from './task-analysis/task-analysis.component';
import { TaskConsoleComponent } from './task-console/task-console.component';
import { TaskDashboardComponent } from './task-dashboard/task-dashboard.component';
import { TaskHeaderComponent } from './task-header/task-header.component';
import { TaskListComponent } from './task-list/task-list.component';

@Component({
  selector: 'app-tasks',
  imports: [
    CommonModule,
    FormsModule,
    NzSpaceModule,
    NzSelectModule,
    NzButtonModule,
    NzInputModule,
    NzTableModule,
    NzCardModule,
    NzTagModule,
    NzIconModule,
    NzLayoutModule,
    TaskConsoleComponent,
    TaskListComponent,
    TaskActionsComponent,
    TaskHeaderComponent,
    NzLayoutComponent,
    PageLayoutComponent,
    NodeVersionComponent,
    TaskAnalysisComponent,
    TaskDashboardComponent,
  ],
  template: `
    <app-page-layout [title]="'任务'" [isFullscreen]="true">
      <ng-container ngProjectAs="actions">
        <app-node-version />
      </ng-container>
      <nz-layout class="page">
        <app-task-list></app-task-list>
        <nz-content class="content">
          <app-task-header
            [name]="selectedTask()?.spec?.name"
            [description]="selectedTask()?.spec?.description"
            [command]="selectedTask()?.spec?.displayCommand || selectedTask()?.spec?.command"
          ></app-task-header>
          <app-task-actions
            [isStopping]="taskState.isStopping()"
            [isRunning]="taskState.isRunning()"
            [isStartable]="taskState.isStartable()"
            (toggle)="taskState.toggleTask()"
            (restart)="taskState.restartSelected()"
          >
          </app-task-actions>
          <div class="task-panel-shell">
            <div class="task-panel-switcher">
              @for (view of selectedViews(); track view.id) {
              <button
                type="button"
                nz-button
                class="task-panel-button"
                [class.active]="selectedViewId === view.id"
                [nzType]="selectedViewId === view.id ? 'primary' : 'default'"
                (click)="selectTaskPanel(view.id)"
              >
                <nz-icon [nzType]="viewIcon(view.id)" />
                {{ view.title }}
              </button>
              }
            </div>

            <div class="task-panel-body">
              @for (view of selectedViews(); track view.id) {
              <div class="task-panel" [class.panel-hidden]="selectedViewId !== view.id">
                @switch (view.id) {
                @case ('output') {
                <app-task-console
                  [taskId]="taskState.selectedTaskId()"
                  [active]="selectedViewId === 'output'"
                ></app-task-console>
                }
                @case ('dashboard') {
                <app-task-dashboard
                  [taskRow]="selectedTask()"
                  [taskDashboard]="taskDashboard"
                  [taskKind]="selectedTask()?.spec?.kind"
                ></app-task-dashboard>
                }
                @case ('analyzer') {
                <app-task-analysis
                  [taskId]="taskState.selectedTaskId()"
                  [taskKind]="selectedTask()?.spec?.kind"
                  [runtime]="selectedTask()?.runtime"
                ></app-task-analysis>
                }
                }
              </div>
              }
            </div>
          </div>
        </nz-content>
      </nz-layout>
    </app-page-layout>
  `,
  styles: [
    `
      .page {
        height: 100%;
        display: flex;
        flex-direction: row;
        overflow: hidden;
        gap: 16px;
        padding: 0 16px;
      }
      .content {
        flex: 1 1 auto;
        width: 0;
        display: flex;
        flex-direction: column;
        gap: 16px;
        height: 100%;
        overflow: hidden;
      }
      app-task-header,
      app-task-actions,
      app-node-version {
        flex: 0 0 auto;
      }
      .task-panel-shell {
        flex: 1 1 auto;
        height: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .task-panel-switcher {
        flex: 0 0 auto;
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }
      .task-panel-button {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
      }
      .task-panel-button + .task-panel-button {
        border-left: none;
      }
      .task-panel-body {
        flex: 1 1 auto;
        min-height: 0;
        position: relative;
      }
      .task-panel {
        position: absolute;
        inset: 0;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        visibility: visible;
        pointer-events: auto;
        z-index: 1;
      }
      .task-panel.panel-hidden {
        visibility: hidden;
        pointer-events: none;
        z-index: 0;
      }
      app-task-console,
      app-task-analysis,
      app-task-dashboard {
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class TasksComponent {
  projectContext = inject(ProjectContextStore);
  taskState = inject(TaskStateService);
  private api = inject(TasksApiService);
  private stream = inject(TaskStreamService);
  private destroyRef = inject(DestroyRef);

  selectedTask = this.taskState.selectedRow;
  selectedViewId: TaskViewIdDto = 'output';
  taskDashboard: TaskDashboardDto | null = null;
  private loadedDashboardTaskId = '';
  private dashboardUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  @ViewChild(TaskConsoleComponent) private taskConsole?: TaskConsoleComponent;

  constructor() {
    effect(async () => {
      const pid = this.projectContext.currentProjectId();
      if (pid) {
        await this.taskState.setProject(pid);
      }
    });

    effect(() => {
      const taskId = this.taskState.selectedTaskId();
      const views = this.selectedViews();
      if (!views.some((view) => view.id === this.selectedViewId)) {
        this.selectedViewId = views[0]?.id ?? 'output';
      }

      if (this.selectedViewId === 'dashboard') {
        this.loadDashboard(taskId);
      } else if (!taskId) {
        this.taskDashboard = null;
      }
    });

    this.stream.events$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type !== 'analyzeFinished') return;
        const taskId = String(event.payload?.taskId ?? '').trim();
        if (!taskId || taskId !== this.taskState.selectedTaskId()) return;
        const report = event.payload?.report as TaskAnalyzeResultDto | null | undefined;
        if (report) {
          this.setTaskDashboard(this.dashboardFromReport(report));
        }
        this.loadDashboard(taskId, { force: true });
      });

    this.destroyRef.onDestroy(() => {
      if (this.dashboardUpdateTimer) {
        clearTimeout(this.dashboardUpdateTimer);
        this.dashboardUpdateTimer = null;
      }
    });
  }

  selectedViews(): TaskViewDefinitionDto[] {
    const views = this.selectedTask()?.spec?.views;
    return views?.length ? views : [{ id: 'output', title: '输出' }];
  }

  viewIcon(viewId: TaskViewIdDto): string {
    if (viewId === 'dashboard') {
      // return this.selectedTask()?.spec?.kind === 'serve' ? 'cloud-server' : 'dashboard';
      return 'dashboard';
    }
    if (viewId === 'analyzer') {
      // return this.selectedTask()?.spec?.kind === 'serve' ? 'line-chart' : 'bar-chart';
      return 'bar-chart';
    }
    return 'desktop';
  }

  selectTaskPanel(viewId: TaskViewIdDto) {
    if (!this.selectedViews().some((view) => view.id === viewId)) return;
    if (this.selectedViewId === viewId) return;
    this.selectedViewId = viewId;
    if (viewId === 'dashboard') {
      this.loadDashboard(this.taskState.selectedTaskId(), { force: true });
    }
    if (viewId === 'output') {
      this.taskConsole?.activate();
    }
  }

  private loadDashboard(taskId: string | null | undefined, opts?: { force?: boolean }) {
    const id = (taskId ?? '').trim();
    if (!id) {
      this.loadedDashboardTaskId = '';
      this.setTaskDashboard(null);
      return;
    }
    if (!opts?.force && this.loadedDashboardTaskId === id) return;
    this.loadedDashboardTaskId = id;
    this.api.getDashboard(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          if (this.loadedDashboardTaskId !== id) return;
          this.setTaskDashboard(dashboard);
        },
        error: () => {
          this.loadedDashboardTaskId = '';
          this.setTaskDashboard(null);
        },
      });
  }

  private setTaskDashboard(dashboard: TaskDashboardDto | null) {
    if (this.dashboardUpdateTimer) {
      clearTimeout(this.dashboardUpdateTimer);
    }
    this.dashboardUpdateTimer = setTimeout(() => {
      this.dashboardUpdateTimer = null;
      this.taskDashboard = dashboard;
    }, 0);
  }

  private dashboardFromReport(report: TaskAnalyzeResultDto): TaskDashboardDto {
    const runtime = this.selectedTask()?.runtime;
    return {
      taskId: report.taskId,
      projectId: report.projectId,
      runId: report.runId,
      status: runtime?.status ?? 'success',
      progress: {
        startedAt: runtime?.startedAt,
        stoppedAt: runtime?.stoppedAt,
        durationMs: report.summary.durationMs,
        readyAt: runtime?.readyAt,
        rebuildDurationMs: runtime?.rebuildDurationMs,
      },
      sizes: {
        outputPath: report.summary.outputPath,
        fileCount: report.summary.fileCount,
        totalRawSize: report.summary.totalRawSize,
        totalGzipSize: report.summary.totalGzipSize,
        jsRawSize: report.summary.jsRawSize,
        cssRawSize: report.summary.cssRawSize,
        assetRawSize: report.summary.assetRawSize,
      },
      problems: {
        warningsCount: runtime?.warningsCount ?? 0,
        errorsCount: runtime?.errorsCount ?? 0,
        lastError: runtime?.lastError,
      },
      urls: runtime?.urls ?? [],
    };
  }
}
