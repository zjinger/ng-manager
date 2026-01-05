import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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
          <div class="task-item" (click)="openTask()"  nz-tooltip [nzTooltipTitle]="playing ? '运行中' : description||'空闲'" nzTooltipPlacement="right">
              <div class="item-logo">
                <nz-icon nzType="code" nzTheme="outline" />
              </div>
              <div class="list-item-info">
                <div class="name">
                  <span>dev</span>
                </div>
                <div class="description">
                  <span>空闲</span>
                </div>
              </div>
              <button nz-button nzType="text" type="button" (click)="$event.stopPropagation(); playing = !playing">
                <nz-icon [nzType]="playing ? 'pause-circle' : 'play-circle'" nzTheme="outline"   />
              </button>
            </div>
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
  @Input() playing = false;
  @Input() description = '';

  openTask() { }
}
