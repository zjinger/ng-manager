import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ViewChild, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectContextStore } from '@app/core/stores';
import { PageLayoutComponent } from '@app/shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutComponent, NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TaskStateService } from './services/tasks.state.service';
import { TaskActionsComponent } from './task-actions/task-actions.component';
import { TaskConsoleComponent } from './task-console/task-console.component';
import { TaskHeaderComponent } from './task-header/task-header.component';
import { TaskListComponent } from './task-list/task-list.component';
import { NodeVersionComponent } from './node-version/node-version.component';
import { TaskAnalysisComponent } from './task-analysis/task-analysis.component';
import { TaskDashboardComponent } from './task-dashboard/task-dashboard.component';
import { TasksApiService } from './services/tasks-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TaskDashboardDto } from '@yinuo-ngm/protocol';

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
              <button
                type="button"
                nz-button
                class="task-panel-button"
                [class.active]="selectedTabIndex === 0"
                [nzType]="selectedTabIndex === 0 ? 'primary' : 'default'"
                (click)="selectTaskPanel(0)"
              >
                <nz-icon nzType="desktop" />
                输出
              </button>
              <button
                type="button"
                nz-button
                class="task-panel-button"
                [class.active]="selectedTabIndex === 1"
                [nzType]="selectedTabIndex === 1 ? 'primary' : 'default'"
                (click)="selectTaskPanel(1)"
              >
                <nz-icon [nzType]="isServeTask() ? 'cloud-server' : 'dashboard'" />
                {{ isServeTask() ? '仪表盘' : '仪表盘' }}
              </button>
              <button
                type="button"
                nz-button
                class="task-panel-button"
                [class.active]="selectedTabIndex === 2"
                [nzType]="selectedTabIndex === 2 ? 'primary' : 'default'"
                (click)="selectTaskPanel(2)"
              >
                <nz-icon [nzType]="isServeTask() ? 'line-chart' : 'bar-chart'" />
                {{ isServeTask() ? '分析' : '分析' }}
              </button>
            </div>

            <div class="task-panel-body">
              <div class="task-panel" [class.panel-hidden]="selectedTabIndex !== 0">
                <app-task-console [taskId]="taskState.selectedTaskId()"></app-task-console>
              </div>

              <div class="task-panel" [class.panel-hidden]="selectedTabIndex !== 1">
                <app-task-dashboard
                  [taskRow]="selectedTask()"
                  [taskDashboard]="taskDashboard"
                  [taskKind]="selectedTask()?.spec?.kind"
                ></app-task-dashboard>
              </div>

              <div class="task-panel" [class.panel-hidden]="selectedTabIndex !== 2">
                <app-task-analysis
                  [taskId]="taskState.selectedTaskId()"
                  [taskKind]="selectedTask()?.spec?.kind"
                  [runtime]="selectedTask()?.runtime"
                ></app-task-analysis>
              </div>
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
        height: 100%;
        min-height: 0;
      }
      .task-panel.panel-hidden {
        display: none;
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
  private destroyRef = inject(DestroyRef);

  selectedTask = this.taskState.selectedRow;
  selectedTabIndex = 0;
  taskDashboard: TaskDashboardDto | null = null;
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
      if (this.selectedTabIndex === 1) {
        this.loadDashboard(taskId);
      } else if (!taskId) {
        this.taskDashboard = null;
      }
    });
  }

  isServeTask(): boolean {
    return this.selectedTask()?.spec?.kind === 'serve';
  }

  selectTaskPanel(index: number) {
    if (this.selectedTabIndex === index) return;
    this.selectedTabIndex = index;
    if (index === 1) {
      this.loadDashboard(this.taskState.selectedTaskId());
    }
    if (index === 0) {
      this.taskConsole?.activate();
    }
  }

  private loadDashboard(taskId: string | null | undefined) {
    const id = (taskId ?? '').trim();
    if (!id) {
      this.taskDashboard = null;
      return;
    }
    this.api.getDashboard(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          this.taskDashboard = dashboard;
        },
        error: () => {
          this.taskDashboard = null;
        },
      });
  }
}
