import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Project } from '@models/project.model';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { ProjectItemPopoverComponent } from "./project-item-popover.component";
@Component({
  selector: 'app-project-item',
  imports: [CommonModule, FormsModule, NzGridModule, NzButtonModule, NzIconModule, NzPopoverModule, NzBadgeModule, NzSpaceModule, ProjectItemPopoverComponent],
  template: `
    <div nz-row class="project-item" [class.open]="open">
      <div nz-col nzSpan="24" class="content">
        <div class="favorite">
          <button nz-button nzType="primary">
            <nz-icon nzType="star" [nzTheme]="project?.isFavorite ? 'fill' : 'outline'"></nz-icon>
          </button>
        </div>
        <div class="info">
          <div class="list-item-info">
            <div class="name">
              <!-- [nzPopoverVisible]="true"  -->
              <span>{{ project?.name }}</span>
              <nz-badge nzStatus="processing" 
              nz-popover 
              nzTitle="null" 
              nzPopoverTrigger="click"
              [nzPopoverContent]="contentTemplate" 
              nzPopoverPlacement="right" 
              [nzPopoverOverlayClassName]="'project-item-popover'" />
            </div>
            <div class="description">
              <span>{{ project?.description }}</span>
            </div>
          </div>
        </div>
        <div class="actions">
          <nz-space>
            <button nz-button nzType="primary">
              <nz-icon nzType="code" nzTheme="outline" />
              <span>在编辑器中打开</span>
            </button>
            <button nz-button nzType="primary">
              <nz-icon nzType="edit" nzTheme="outline"></nz-icon>
              <span>编辑</span>
            </button>
            <button nz-button nzType="primary">
              <nz-icon nzType="delete" nzTheme="outline"></nz-icon>
              <span>删除</span>
            </button>
          </nz-space>
        </div>
      </div>
    </div>

    <ng-template #contentTemplate>
      <app-project-item-popover></app-project-item-popover>
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
  @Input() project: Project | null = null;
  @Input() open = false;
}
