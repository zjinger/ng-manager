import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, Output } from '@angular/core';
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
import { UiNotifierService } from '@app/core';
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
                 <nz-badge 
                    [nzStatus]="hasTasksRunning() ? 'processing' : 'default'"
                    [nz-tooltip]="taskBadgeTip()">
                  </nz-badge>
                </span>
            </div>
            <div class="root-path">
              <span>{{ project?.root }}</span>
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
            <button nz-button nzType="primary" (click)="$event.stopPropagation();del()" nz-tooltip="删除">
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
            gap: 4px;
            .name{
              flex: auto 0 0;
              nz-badge{ margin-left:8px;}
            }
            .root-path{
              flex:auto 0 0;
              opacity:0.7;
              font-size:14px;
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
  private notify = inject(UiNotifierService);

  @Input() project: Project | null = null;
  @Input() open = false;

  @Output() selectProject = new EventEmitter<void>();
  @Output() toggleFavorite = new EventEmitter<void>();
  @Output() editProject = new EventEmitter<void>();
  @Output() openInEditor = new EventEmitter<void>();
  @Output() deleteProject = new EventEmitter<void>();

  /** 运行中任务数（running/stopping） */
  readonly tasksRunningCount = computed((): number => {
    const pid = this.project?.id?.trim();
    if (!pid) return 0;
    return this.taskRuntime.runningCountSignal(pid)();
  });

  /** 是否有任务占用中 */
  readonly hasTasksRunning = computed((): boolean => {
    return this.tasksRunningCount() > 0;
  });

  /** tooltip 文案 */
  readonly taskBadgeTip = computed(() => {
    const n = this.tasksRunningCount();
    return n > 0 ? `${n} 个任务正在运行` : '任务';
  });

  del() {
    if (this.hasTasksRunning()) {
      this.notify.warn('当前项目有任务正在运行，请先停止这些任务后再删除项目。');
      return;
    }
    this.deleteProject.emit();
  }
}
