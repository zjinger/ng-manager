import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { ApiCollectionEntity, ApiCollectionKind, ApiCollectionTreeNode } from '@models/api-client';
import type { ApiRequestEntity } from '@models/api-client/api-request.model';
import { genCollectionTreeNodes } from '@pages/api-client/utils';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { CollectionTreeComponent } from './collection-tree.component';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

@Component({
  selector: 'app-request-collections',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzMenuModule,
    NzPopoverModule,
    CollectionTreeComponent,],
  template: `
    <div class="wrap">
      <div class="header">
        <nz-input-wrapper>
          <nz-icon class="search-icon" nzInputPrefix nzType="search" />
          <input
            nz-input
            placeholder="搜索"
            [ngModel]="q()"
            (ngModelChange)="q.set($event)"
          />
        </nz-input-wrapper>
        <button nz-button (click)="reload.emit()" nzType="text">
          <nz-icon [nzType]="loading ? 'loading' : 'reload'" nzTheme="outline" />
        </button>
        <button 
          nz-button 
          nz-popover 
          nzPopoverTrigger="click"
          [(nzPopoverVisible)]="visible"
          [nzPopoverContent]="menuTpl"
          nzPopoverPlacement="bottomCenter"
          [nzPopoverOverlayClassName]="'project-item-popover'"
          nzType="text"
          >
          <nz-icon nzType="plus" nzTheme="outline" />
        </button>
      </div>
      <div class="body">
        <!-- <app-request-list
          [requests]="filtered()"
          [activeId]="activeId"
          (select)="select.emit($event)"
        /> -->
        <app-collection-tree
          [nodes]="nodes()"
          [activeRequestId]="activeId"
          (selectRequest)="select.emit($event)"
          (createRequest)="createRequest.emit({ collectionId: $event.collectionId })"
          (createFolder)="createFolder.emit({ collectionId: $event.collectionId ?? null })"
          (rename)="rename.emit($event)"
          (move)="move.emit($event)"
          (delete)="delete.emit({ id: $event.id, kind: $event.kind })"
        >
        </app-collection-tree>
      </div>
    </div>
    <ng-template #menuTpl>
      <ul nz-menu>
        <li nz-menu-item (click)="createRequest.emit({ collectionId: null });visible=false" class="item">
            <nz-icon nzType="api"></nz-icon>
            <span>新建请求</span>
        </li>
        <li nz-menu-item (click)="createCollection.emit()" class="item">
            <nz-icon nzType="folder-add"></nz-icon>
            <span>新建集合</span>
        </li>
      </ul>
    </ng-template>
  `,
  styles: [`
    :host { height: 100%; display: flex; flex-direction: column; width: 320px; flex: 0 0 320px; }
    .wrap { height: 100%; display: flex; flex-direction: column; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 12px; overflow: hidden; }
    .header {
      width: 100%;
      padding: 10px 12px;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      flex: 0 0 auto;

      nz-input-wrapper {
        width: 100%;
        border-radius: 18px;
      }
    }
    .body{
      flex: 1 1 auto;
      height: 0;
      display: flex;
      flex-direction: column;
    }
  `],
})
export class RequestCollectionsComponent {
  requests = input<ApiRequestEntity[]>([])
  collections = input<ApiCollectionEntity[]>([])

  @Input() activeId: string | null = null;
  @Input() loading: boolean = false;

  @Output() select = new EventEmitter<string>();
  @Output() createRequest = new EventEmitter<{ collectionId: string | null }>();
  @Output() createCollection = new EventEmitter<void>();
  @Output() createFolder = new EventEmitter<{ collectionId: string | null }>();

  @Output() reload = new EventEmitter<void>();
  @Output() delete = new EventEmitter<{ id: string, kind: ApiCollectionKind }>();
  @Output() rename = new EventEmitter<{ id: string, kind: ApiCollectionKind }>();
  @Output() move = new EventEmitter<{ id: string, kind: ApiCollectionKind }>();

  visible = false;

  q = signal('');

  nodes = computed<ApiCollectionTreeNode[]>(() => {
    const kw = this.q()
    const collections = this.collections()
    const requests = this.requests()
    return genCollectionTreeNodes(collections, requests, kw);
  });

  // filtered = computed(() => {
  //   const kw = this.q().trim().toLowerCase();
  //   if (!kw) return this.requests();

  //   return (this.requests() ?? []).filter(r => {
  //     const name = (r.name ?? '').toLowerCase();
  //     const url = (r.url ?? '').toLowerCase();
  //     return name.includes(kw) || url.includes(kw);
  //   });
  // });
}

