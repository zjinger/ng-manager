import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TaskRow } from '@models/task.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-project-item-popover',
  imports: [CommonModule, NzIconModule, NzButtonModule, NzTooltipModule],
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
          @for( task of tasks;track task.spec.id){ 
            <div class="task-item" (click)="openTask(task)"  nz-tooltip [nzTooltipTitle]="getTaskStatus(task)" nzTooltipPlacement="right">
              <div class="item-logo">
                <nz-icon nzType="code" nzTheme="outline" />
              </div>
              <div class="list-item-info">
                <div class="name">
                  <span>dev</span>
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
      min-width:150px;
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
        width:400px;
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
export class ProjectItemPopoverComponent {
  @Input() tasks: TaskRow[] = []

  openTask(task: TaskRow) { }

  toggleTask(task: TaskRow) { }

  getTaskStatus(task: TaskRow) {
    switch (task.runtime.status) {
      case "running": return "运行中";
      case "success": return "成功";
      case "failed": return "错误";
      case "stopped": return "已停止";
      default: return "空闲";
    }
  }

  getTaskName(task: TaskRow) {
    return task.spec.name || task.spec.id;
  }

  getTaskDescription(task: TaskRow) {
    switch (task.runtime.status) {
      case "running": return `运行中 (PID: ${task.runtime.pid})`;
      case "success": return "上次运行成功";
      case "failed": return "上次运行错误";
      case "stopped": return "已停止";
      default: return "空闲";
    }
  }

  getTaskActionIcon(task: TaskRow) {
    return task.runtime.status == 'running' ? 'pause-circle' : 'play-circle';
  }
}
