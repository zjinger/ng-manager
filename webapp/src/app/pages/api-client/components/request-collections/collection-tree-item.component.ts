import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiCollectionKind, ApiCollectionTreeNode } from '@models/api-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";

/**
 * 集合树项组件
 */
@Component({
  selector: 'app-collection-tree-item',
  imports: [CommonModule, NzButtonModule, FormsModule, NzIconModule, NzPopoverModule, NzMenuModule, NzTagModule, NzPopconfirmModule],
  template: `
     <div class="row" [class.active]="activeKey === node.key">
      @if(hasChildren){
        <button
          class="chev"
          nz-button
          nzType="text"
          nzSize="small"
          (click)="toggle.emit(node.key); $event.stopPropagation()"
        >
          <nz-icon class="chev-icon" [class.expanded]="expanded" [nzType]="'right'"></nz-icon>
        </button>
      }

      <div class="main" (click)="onClick()">
        @if(iconType){
          <nz-icon class="icon" [nzType]="iconType"></nz-icon>
        }

        @if (node.kind === 'request') {
          <nz-tag class="method" [nzColor]="getMethodColor(node.method)">{{ node.method || '' }}</nz-tag>
        }

        <div class="texts">
          <div class="title">{{ node.title }}</div>
          @if (node.subtitle) {
            <div class="sub">{{ node.subtitle }}</div>
          }
        </div>
      </div>

      <button
        class="more"
        nz-button
        nzType="text"
        nzSize="small"
        (click)="$event.stopPropagation()"
        nz-popover
        nzPopoverTrigger="click"
        [(nzPopoverVisible)]="visible"
        nzPopover
        [nzPopoverContent]="menuTpl"
        nzPopoverPlacement="right"
        [nzPopoverOverlayClassName]="'project-item-popover'"> 
        <nz-icon nzType="more" nzTheme="outline"></nz-icon>
      </button>

      <ng-template #menuTpl>
        <ul nz-menu>
          @if (node.kind !== 'request') {
            @if(node.kind==='collection') {
              <li nz-menu-item (click)="createFolder.emit(node.id); visible = false">
                <nz-icon nzType="folder"></nz-icon>
                <span>新建目录</span>
              </li>
            }
            <li nz-menu-item (click)="createRequest.emit(node.id); visible = false">
              <nz-icon nzType="plus"></nz-icon>
              <span>新建请求</span>
            </li>
            @if(node.kind==='folder') {
              <li nz-menu-item (click)="move.emit(node.id); visible = false">
                <nz-icon nzType="folder"></nz-icon>
                <span>移动到</span>
              </li>
            }
            <li nz-menu-item (click)="rename.emit(node.id); visible = false">
              <nz-icon nzType="edit"></nz-icon>
              <span>重命名</span>
            </li>
            <li nz-menu-divider></li>
            <li nz-menu-item nzDanger nz-popconfirm nzPopconfirmTitle="确认删除吗？"  (nzOnConfirm)="delete.emit(node.id)">
              <nz-icon nzType="delete"></nz-icon>
              <span>删除</span>
            </li>

          } @else {
            <li nz-menu-item (click)="move.emit(node.id); visible = false">
              <nz-icon nzType="folder"></nz-icon>
              <span>移动到</span>
            </li>
            <li nz-menu-item (click)="rename.emit(node.id); visible = false">
              <nz-icon nzType="edit"></nz-icon>
              <span>重命名</span>
            </li>
            <li nz-menu-divider></li>
            <li nz-menu-item nzDanger nz-popconfirm nzPopconfirmTitle="确认删除吗？"  (nzOnConfirm)="delete.emit(node.id)">
              <nz-icon nzType="delete"></nz-icon>
              <span>删除</span>
            </li>
          }
        </ul>
      </ng-template>
    </div>

    @if (hasChildren && expanded) {
      <div class="children">
        <ng-content />
      </div>
    }
  `,
  host: {
    '[class.ctree-item]': 'true',
  },
  styles: `
    :host.ctree-item { 
      display: block; 
    }
    
    .row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .row:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
    
    .row.active {
      background-color: #e6f7ff;
    }
    
    .row.active:hover {
      background-color: #bae7ff;
    }
    
    .chev {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
      padding: 0 !important;
    }
    
    .chev-icon {
      font-size: 12px;
      transition: transform 0.2s ease;
      color: rgba(0, 0, 0, 0.45);
    }
    
    .chev-icon.expanded {
      transform: rotate(90deg);
    }
    
    .main {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    
    .icon {
      opacity: 0.65;
      font-size: 14px;
    }
    
    .method {
      flex: 0 0 auto;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.4;
      padding: 0 4px;
      margin: 0;
    }
    
    .texts {
      flex: 1;
      min-width: 0;
    }
    
    .title {
      font-size: 13px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: rgba(0, 0, 0, 0.85);
    }
    
    .sub {
      font-size: 12px;
      opacity: 0.5;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 2px;
    }
    
    .more {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
      padding: 0 !important;
      visibility: hidden;
      opacity: 0.5;
    }
    
    .more:hover {
      opacity: 1;
    }
    
    .row:hover .more {
      visibility: visible;
    }
    
    .children {
      margin-left: 20px;
      padding-left: 4px;
      border-left: 1px dashed rgba(0, 0, 0, 0.08);
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  `,
})
export class CollectionTreeItemComponent {
  @Input() node!: ApiCollectionTreeNode;
  @Input() expanded = false;
  @Input() activeKey: string | null = null;

  @Output() toggle = new EventEmitter<string>();
  @Output() selectRequest = new EventEmitter<string>();
  @Output() selectCollection = new EventEmitter<string>();

  // 菜单事件（先透传，store 后续接）
  @Output() createRequest = new EventEmitter<string>(); // collectionId
  @Output() createFolder = new EventEmitter<string>(); // collectionId
  @Output() rename = new EventEmitter<string>();
  @Output() move = new EventEmitter<string>();
  @Output() copyCurl = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  visible = false;

  get hasChildren() { return (this.node.children?.length ?? 0) > 0; }
  get iconType() {
    if (this.node.kind === 'request') return ''; //api
    return this.node.kind === 'folder' ? 'folder' : 'database';
  }

  onClick() {
    if (this.node.kind === 'request') this.selectRequest.emit(this.node.id);
    else this.selectCollection.emit(this.node.id);
  }

  /**
   * 获取方法对应的颜色
   */
  getMethodColor(method: string | undefined): string {
    const colors: Record<string, string> = {
      GET: '#61affe',
      POST: '#49cc90',
      PUT: '#fca130',
      PATCH: '#50e3c2',
      DELETE: '#f93e3e',
      HEAD: '#909090',
      OPTIONS: '#909090',
    };
    return colors[method?.toUpperCase() || ''] || '#909090';
  }
}
