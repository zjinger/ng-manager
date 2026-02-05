import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiRequestEntity } from '@models/api-request.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-request-list-item',
  imports: [CommonModule, NzTagModule, NzIconModule, NzButtonModule, NzPopoverModule, NzMenuModule, NzTooltipModule],
  host: {
    '[class.request-item]': 'true',
    '[class.active]': 'r.id === activeId',
    '(click)': '$event.stopPropagation();select.emit(r.id)',
    '(mouseover)': '$event.stopPropagation();mouseover=true',
    '(mouseleave)': '$event.stopPropagation();mouseover=false',
  },
  template: `
    <div class="content" [nz-tooltip]="r.url" [nzTooltipTrigger]="'hover'" nzTooltipPlacement="right">
        <nz-tag class="method">{{r.method}}</nz-tag>
        <span class="name">{{r.name || '未命名'}}</span>
    </div>
    <button class="more-actions" nz-button nzType="text" nzSize="small" (click)="$event.stopPropagation();" 
          nz-popover 
          nzPopoverTrigger="click" 
          [nzPopoverContent]="contentTemplate" 
          nzPopoverPlacement="topRight" 
          [nzPopoverOverlayClassName]="'project-item-popover'"> 
        <nz-icon nzType="more" nzTheme="outline"  /> 
    </button>
    <!-- <div class="row2">
      <span class="url">{{r.url}}</span>
    </div>

    <div class="row3">
      <span class="time">{{r.updatedAt ? (r.updatedAt | date:'MM-dd HH:mm') : ''}}</span>
    </div> -->
    <ng-template #contentTemplate>
      <ul nz-menu>
        <li nz-menu-item class="menu-item">
          <nz-icon nzType="edit" nzTheme="outline" />
          <span>重命名</span>
        </li>
        <li nz-menu-item class="menu-item">
          <nz-icon nzType="folder" nzTheme="outline" />
          <span>移动到</span>
        </li>
        <li nz-menu-item class="menu-item">
          <nz-icon nzType="export" nzTheme="outline" />
          <span>导出</span>
        </li>
        <li nz-menu-item class="menu-item">
          <nz-icon nzType="copy" nzTheme="outline" />
          <span>复制cURL</span>
        </li>
        <li nz-menu-divider></li>
        <li nz-menu-item nzDanger class="menu-item" (click)="delete.emit(r.id)">
          <nz-icon nzType="delete"></nz-icon>
          <span>删除</span>
        </li>
      </ul>
    </ng-template>
  `,
  styles: [
    `
      :host.request-item{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        border:1px solid #f0f0f0;
        border-radius:10px;
        padding:10px;
        cursor:pointer;
        transition: background .15s, border-color .15s;
      }
      :host.request-item.active{
        background:#f5f5f5;
        border-color:#d9d9d9;
      }
      .content{
        display:flex;
        align-items:center;
        gap:8px;
        flex:1;
        overflow:hidden;
      }
      button.more-actions{
        flex:0 0 auto;
        visibility: hidden;
      }
      :host.request-item:hover button.more-actions{
        visibility: visible;
      }
      .method{
        flex:0 0 auto;
      }
      .name{
        flex:1 1 auto;
        font-weight:600;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .time{
        font-size:12px;
        color:rgba(0,0,0,.45);
      }
      .menu-item{
        display:flex;
        align-items:center;
      }
    `
  ],
})
export class RequestListItemComponent {
  @Input() r!: ApiRequestEntity;
  @Input() activeId: string | null = null;
  @Output() select = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  mouseover: boolean = false;

}
