import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiRequestEntity } from '@models/api-client/api-request.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

/**
 * 请求列表项组件
 */
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
        <nz-tag class="method" [nzColor]="getMethodColor(r.method)">{{r.method}}</nz-tag>
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
      :host.request-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      :host.request-item:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }
      
      :host.request-item.active {
        background-color: #e6f7ff;
      }
      
      :host.request-item.active:hover {
        background-color: #bae7ff;
      }
      
      .content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        overflow: hidden;
      }
      
      button.more-actions {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        padding: 0 !important;
        visibility: hidden;
        opacity: 0.5;
      }
      
      button.more-actions:hover {
        opacity: 1;
      }
      
      :host.request-item:hover button.more-actions {
        visibility: visible;
      }
      
      .method {
        flex: 0 0 auto;
        font-size: 10px;
        font-weight: 600;
        line-height: 1.4;
        padding: 0 4px;
        margin: 0;
      }
      
      .name {
        flex: 1 1 auto;
        font-size: 13px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: rgba(0, 0, 0, 0.85);
      }
      
      .menu-item {
        display: flex;
        align-items: center;
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

  /**
   * 获取方法对应的颜色
   */
  getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      GET: '#61affe',
      POST: '#49cc90',
      PUT: '#fca130',
      PATCH: '#50e3c2',
      DELETE: '#f93e3e',
      HEAD: '#909090',
      OPTIONS: '#909090',
    };
    return colors[method.toUpperCase()] || '#909090';
  }
}
