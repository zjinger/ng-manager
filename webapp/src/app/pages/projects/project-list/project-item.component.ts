import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Project } from '@models/project.model';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { ProjectItemPopoverComponent } from "./project-item-popover.component";
import { NzTooltipDirective } from "ng-zorro-antd/tooltip";
import { TaskRuntimeStore } from '@pages/tasks/services/task-runtime-store';
@Component({
  selector: 'app-project-item',
  imports: [CommonModule, FormsModule, NzGridModule, NzButtonModule, NzIconModule, NzPopoverModule, NzBadgeModule, NzSpaceModule, ProjectItemPopoverComponent, NzTooltipDirective],
  template: `
    <div nz-row class="project-item" [class.open]="open" (click)="selectProject.emit()">
      <div nz-col nzSpan="24" class="content">
        <div class="favorite">
          <button nz-button nzType="primary" (click)="$event.stopPropagation();toggleFavorite.emit()">
            <nz-icon nzType="star" [nzTheme]="project?.isFavorite ? 'fill' : 'outline'"></nz-icon>
          </button>
        </div>
        <div class="info">
          <div class="list-item-info">
            <div class="name">
              <span>{{ project?.name }}</span>
               <span
                  class="task-popover-trigger"
                  (click)="$event.stopPropagation()"
                  nz-popover
                  nzPopoverTrigger="click"
                  [nzPopoverContent]="contentTemplate"
                  nzPopoverPlacement="right"
                  [nzPopoverOverlayClassName]="'project-item-popover'"
                >
                 <nz-badge [nzStatus]="'processing'" [nz-tooltip]="hasTasksRunning() ? '1个任务正在运行' : '任务'"></nz-badge>
                </span>
            </div>
            <div class="description">
              <span>{{ project?.description }}</span>
            </div>
          </div>
        </div>
        <div class="actions">
          <nz-space nzSize="large">
            <button nz-button nzType="primary" (click)="$event.stopPropagation();openInEditor.emit()">
              <nz-icon nzType="code" nzTheme="outline"/>
              <span>在编辑器中打开</span>
            </button>
            <button nz-button nzType="primary" (click)="$event.stopPropagation();editProject.emit()" nz-tooltip="重命名">
              <nz-icon nzType="edit" nzTheme="outline"/>
            </button>
            <button nz-button nzType="primary" (click)="$event.stopPropagation();deleteProject.emit()" nz-tooltip="删除">
              <nz-icon nzType="delete" nzTheme="outline"/>
            </button>
          </nz-space>
        </div>
      </div>
    </div>

    <ng-template #contentTemplate>
      <app-project-item-popover [projectId]="project?.id"></app-project-item-popover>
    </ng-template>
  `,
  styles: [
    `
    .project-item{
      border-radius:4px;
      padding:0;
      margin:8px 0;
      transition:all .3s;
      cursor:pointer;
      &.open, &:hover{
        box-shadow:0 4px 12px rgba(0,0,0,.1);
        background:var(--app-primary-3);
      }
      .content{
          padding: 16px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-rows: auto;
          grid-template-areas: "icon info actions";
          grid-gap: 16px;
          align-items: center;

        .favorite{
          grid-area: icon;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .info{
          grid-area: info;
          .list-item-info {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: center;
            .name{
              flex: auto 0 0;
              nz-badge{ margin-left:8px;}
            }
            .description{
              flex:auto 0 0;
            }
          }
        }
    }
  }
    `
  ],
})
export class ProjectItem {
  private taskRuntime = inject(TaskRuntimeStore);

  @Input() project: Project | null = null;
  @Input() open = false;

  /** 父组件传入该项目的任务 id 列表 */
  @Input() taskIds: string[] = [];

  @Output() selectProject = new EventEmitter<void>();
  @Output() toggleFavorite = new EventEmitter<void>();
  @Output() editProject = new EventEmitter<void>();
  @Output() openInEditor = new EventEmitter<void>();
  @Output() deleteProject = new EventEmitter<void>();

  

  /**
   * 是否有任务在运行
   * - 只要该 project 任意 taskId 的 runtime.status 是 running，就认为在运行
   */
  hasTasksRunning(): boolean {
    for (const id of this.taskIds ?? []) {
      const st = this.taskRuntime.statusSignal(id)(); // 读 signal 快照
      if (st?.status === 'running') return true;
      // 如果你还有 starting/queued 之类状态，也可以一起算：
      // if (st?.status === 'running' || st?.status === 'starting' || st?.status === 'queued') return true;
    }
    return false;
  }
}
