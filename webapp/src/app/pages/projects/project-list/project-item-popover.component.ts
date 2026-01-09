import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, Signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TaskItemVM, TaskStatus } from '@models/task.model';
import { TaskStateService } from '@pages/tasks/services/tasks.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ProjectStateService } from '../services/project.state.service';

@Component({
  selector: 'app-project-item-popover',
  imports: [CommonModule, NzIconModule, NzButtonModule, NzTooltipModule, RouterModule],
  template: `
      <div class="dropdown-content">
        <div class="pane-toolbar">
          <div class="icon">
            <nz-icon nzType="inbox" nzTheme="outline" />
          </div>
          <div class="title">任务</div>
          <button nz-button  type="button" nzType="text">
            <nz-icon nzType="close" nzTheme="outline" />
          </button>
        </div>
        <div class="tasks">
          @for( task of tasks();track task.spec.id){ 
            <div class="task-item" (click)="openTask(task)"  nz-tooltip [nzTooltipTitle]="getTaskDescription(task)" nzTooltipPlacement="right">
              <div class="item-logo">
                <nz-icon nzType="code" nzTheme="outline" />
              </div>
              <div class="list-item-info">
                <div class="name">
                  <span>{{task.spec.name}}</span>
                </div>
                <div class="description">
                  <span>{{ getTaskDescription(task) }}</span>
                </div>
              </div>
              <button nz-button nzType="text" type="button" (click)="$event.stopPropagation(); toggleTask(task)">
                <nz-icon [nzType]="getTaskActionIcon(task)" nzTheme="outline"   />
              </button>
            </div>
          }
          </div>
      </div>
  `,
  styles: [
    `
    .dropdown-content{
      display: flex;
      flex-direction: column;
      .pane-toolbar{
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 6px 6px 6px 16px;
        &>*{
          flex: auto 0 0;
        }
        .icon{
          font-size:18px;
          margin-right:6px;
        }
        .title{
          flex: 100% 1 1;
          width: 0;
          overflow: hidden;
          -ms-text-overflow: ellipsis;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      .tasks{
        width:320px;
        max-height:360px;
        overflow: hidden auto;
        .task-item{
          padding:16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          cursor:pointer;
          &:hover{
            background:#f5f5f5;
          }
          .item-logo{
            font-size:42px;
            margin-right:16px;
            flex: auto 0 0;
            display: inline-flex;
            align-items: center;
          }
          .list-item-info {
            flex: 100% 1 1;
            width: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: center;
            .description{
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
          button{
            flex: auto 0 0;
            nz-icon{
              font-size:24px;
            }
          }
          }
      }
    }
    `
  ],
})
export class ProjectItemPopoverComponent implements OnChanges {
  @Input() projectId: string | undefined;

  private taskState = inject(TaskStateService);
  private router = inject(Router);
  private projectState = inject(ProjectStateService);

  // “按 projectId 的 rowsView”
  readonly tasks: Signal<TaskItemVM[]> = computed(() => {
    const pid = (this.projectId ?? "").trim();
    if (!pid) return [];
    const tasks = this.taskState.listVMOf(pid)();
    console.log('ProjectItemPopoverComponent tasks:', tasks);
    return tasks;
  });

  async ngOnChanges() {
    const pid = (this.projectId ?? "").trim();
    if (!pid) return;
    await this.taskState.ensureProjectLoaded(pid);
  }

  async openTask(task: TaskItemVM) {
    console.log('ProjectItemPopoverComponent openTask:', task);
    const pid = (task.spec.projectId ?? "").trim();
    if (!pid) return;
    this.projectState.setCurrentProjectById(pid);
    // 让 state 先切项目+选中（不依赖 tasks 页面是否已初始化）
    await this.taskState.openTask(pid, task.spec.id);
    // 跳转（按你实际路由改）
    await this.router.navigate(["/tasks"], {
      queryParams: { projectId: pid, taskId: task.spec.id },
    });
  }

  async toggleTask(task: TaskItemVM) {
    // 先跳转并选中
    await this.openTask(task);
    // 再执行动作（用“真实状态”判断：优先 runtime.status）
    const st = (task.runtime?.status ?? task.status) as TaskStatus | undefined;
    if (st === "running" || st === "stopping") {
      const runId =
        (task.runtime?.runId ?? task.runId ?? "").trim();
      if (runId) this.taskState.stopRun(runId);
    } else {
      this.taskState.startTask(task.spec.id);
    }
  }

  getTaskName(task: TaskItemVM) {
    return task.spec.name || task.spec.id;
  }
  getTaskDescription(task: TaskItemVM) {
    const st = task.status
    return task.runtime ? this.computedStatusText(st) : task.spec.description || "";
  }

  getTaskActionIcon(task: TaskItemVM) {
    const st = task.status;
    return st === "running" || st === "stopping" ? "pause-circle" : "play-circle";
  }

  private computedStatusText(status: TaskStatus | undefined): string {
    switch (status) {
      case "running": return "运行中";
      case "stopping": return "停止中";
      case "success": return "成功";
      case "failed": return "错误";
      case "stopped": return "已停止";
      default: return "空闲";
    }
  }
}
