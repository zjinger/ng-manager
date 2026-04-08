import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, input, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiCollectionKind, ApiCollectionTreeNode } from '@models/api-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { CollectionTreeItemComponent } from './collection-tree-item.component';
@Component({
  selector: 'app-collection-tree',
  imports: [CommonModule, FormsModule, NzInputModule, NzIconModule, NzButtonModule, CollectionTreeItemComponent],
  host: {
    '[class.tree-body]': 'true',
  },
  template: `
      @for (n of nodes; track n.key) {
        <ng-container [ngTemplateOutlet]="nodeTpl" [ngTemplateOutletContext]="{ $implicit: n }" />
      }
      @if (!nodes.length) {
        <div class="empty">暂无请求</div>
      }
      <ng-template #nodeTpl let-node>
        <app-collection-tree-item
          [node]="node"
          [expanded]="expanded(node.key)"
          [activeKey]="activeKey()"
          (toggle)="toggle($event)"
          (selectRequest)="onSelectRequest($event)"
          (selectCollection)="onSelectCollection($event)"
          (createRequest)="createRequest.emit({ collectionId: $event })"
          (createFolder)="createFolder.emit({ collectionId: $event })"
          (rename)="rename.emit({ id: $event, kind: node.kind })"
          (move)="move.emit({ id: $event, kind: node.kind })"
          (copyCurl)="copyCurl.emit($event)"
          (delete)="delete.emit({ id: $event, kind: node.kind })"
        >
          @for (c of node.children; track c.key) {
            <ng-container [ngTemplateOutlet]="nodeTpl" [ngTemplateOutletContext]="{ $implicit: c }" />
          }
        </app-collection-tree-item>
      </ng-template>
  `,
  styles: `
    :host.tree-body {
      flex: 1 1 auto;
      height: 0;
      overflow: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    :host.tree-body .empty {
      padding: 24px 16px;
      opacity: 0.5;
      text-align: center;
      font-size: 13px;
    }
  `,
})
export class CollectionTreeComponent {

  @Input() nodes: ApiCollectionTreeNode[] = [];

  activeRequestId = input<string | null>(null);

  @Output() selectRequest = new EventEmitter<string>();
  @Output() selectCollection = new EventEmitter<string>();

  // @Output() createCollection = new EventEmitter<{ parentId: string | null; kind: 'folder' | 'collection' }>();
  @Output() createRequest = new EventEmitter<{ collectionId: string | null }>();
  @Output() createFolder = new EventEmitter<{ collectionId: string | null }>();


  // 可选：菜单事件对外透传
  @Output() rename = new EventEmitter<{ id: string; kind: ApiCollectionKind }>();
  @Output() move = new EventEmitter<{ id: string, kind: ApiCollectionKind }>();
  @Output() copyCurl = new EventEmitter<string>();
  @Output() delete = new EventEmitter<{ id: string, kind: ApiCollectionKind }>();

  // activeKey：给选中样式用（request 优先）
  activeKey = computed(() => {
    return (this.activeRequestId() ? `r:${this.activeRequestId()}` : null)
  });

  // 当前选中的 collection（用于“新建请求”默认归属）
  private _activeCollectionId = signal<string | null>(null);
  activeCollectionId = computed(() => this._activeCollectionId());

  // 展开态：key -> boolean
  private expandedMap = signal<Record<string, boolean>>({});

  expanded(key: string) {
    return !!this.expandedMap()[key];
  }
  toggle(key: string) {
    const m = { ...this.expandedMap() };
    m[key] = !m[key];
    this.expandedMap.set(m);
  }
  onSelectRequest(id: string) {
    this.selectRequest.emit(id);
  }
  onSelectCollection(id: string) {
    this._activeCollectionId.set(id);
    this.selectCollection.emit(id);
    // 体验：点 collection 自动展开（MVP）
    const key = `c:${id}`;
    const m = { ...this.expandedMap() };
    m[key] = true;
    this.expandedMap.set(m);
  }
}
