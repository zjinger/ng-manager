import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';

import type {
  ApiCollectionCreateBody,
  ApiCollectionTreeNode,
  ApiCollectionUpdateBody,
  ApiCollectionModalData,
  ApiCollectionRenameModalData,
  ApiCollectionCreateModalData,
  ApiCollectionMoveModalData,
} from '@models/api-client';

type Key = string; // "c:xxx"
function toKey(id: string | null | undefined): Key | null {
  return id ? `c:${id}` : null;
}
function keyToId(key: Key | null): string | null {
  if (!key) return null;
  return key.startsWith('c:') ? key.slice(2) : null;
}

@Component({
  selector: 'app-collection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzIconModule],
  template: `
    <div class="modal-body">
      @if (showName()) {
        <label class="label">名称</label>
        <nz-input-wrapper >
          <input
            nz-input
            [ngModel]="name()"
            (ngModelChange)="name.set($event)"
            placeholder="请输入名称"
            autofocus
          />
          <nz-icon nzInputPrefix [nzType]="iconForKind()" nzTheme="outline"></nz-icon>
        </nz-input-wrapper>
        @if (nameErr()) { <div class="hint err">{{ nameErr() }}</div> }
      }

      @if (showParentPicker()) {
        <!-- <label class="label">{{mode() === 'move' ? '移动到' : '选择目录'}}</label> -->
        <!-- <nz-input-wrapper >
          <input nz-input placeholder="搜索目录" [ngModel]="q()" (ngModelChange)="q.set($event)" />
          <nz-icon class="search-icon" nzInputSuffix nzType="search" />
        </nz-input-wrapper> -->

        <div class="picker">
          <div class="row root" [class.selected]="selectedKey() === null" (click)="select(null)">
            <nz-icon nzType="home"></nz-icon>
            <span>根目录</span>
          </div>

          @for (n of filteredNodes(); track n.key) {
            <ng-container
              [ngTemplateOutlet]="nodeTpl"
              [ngTemplateOutletContext]="{ $implicit: n, level: 0 }"
            />
          }

          @if (!filteredNodes().length) {
            <div class="empty">暂无目录</div>
          }
        </div>

        @if (moveErr()) { <div class="hint err">{{ moveErr() }}</div> }
      }
    </div>

    <div class="footer">
      <button nz-button (click)="cancel()">取消</button>
      <button nz-button nzType="primary" [disabled]="!canSubmit()" (click)="ok()">
        确定
      </button>
    </div>

    <ng-template #nodeTpl let-node let-level="level">
      <div
        class="row"
        [style.paddingLeft.px]="8 + level * 16"
        [class.selected]="selectedKey() === node.key"
        (click)="select(node.key)"
      >
          <button
          class="chev"
          nz-button
          nzType="text"
          nzSize="small"
          (click)="toggle(node.key); $event.stopPropagation()"
          [disabled]="!node.children?.length"
        >
          <nz-icon [nzType]="node.children?.length ? (expanded(node.key) ? 'down' : 'right') : 'minus'"></nz-icon>
        </button>
        <nz-icon class="icon" [nzType]="node.kind === 'folder' ? 'folder' : 'database'"></nz-icon>
        <span class="title">{{ node.title }}</span>
      </div>

      @if ((node.children?.length ?? 0) && expanded(node.key)) {
        @for (c of node.children; track c.key) {
          <ng-container
            [ngTemplateOutlet]="nodeTpl"
            [ngTemplateOutletContext]="{ $implicit: c, level: level + 1 }"
          />
        }
      }
    </ng-template>
  `,
  styles: [`
    .modal-body { display: grid; gap: 12px; }
    .label{ font-weight:600; }
    .hint { font-size: 12px; opacity: .75; }
    .hint.err{ color:#cf1322; opacity:1; }

    .picker{
      max-height: 52vh;
      overflow:auto;
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 12px;
      padding: 8px;
      display:flex;
      flex-direction:column;
      gap:6px;
    }
    .row{
      display:flex;
      align-items:center;
      gap:8px;
      padding:8px 8px;
      border-radius:10px;
      cursor:pointer;
      user-select:none;
      transition: background .15s;
      border: 1px solid transparent;
    }
    .row:hover{ background: rgba(0,0,0,.04); }
    .row.selected{ background: rgba(0,0,0,.08); border-color: rgba(0,0,0,.08); }
    .row.root{ font-weight:600; }
    .chev{ flex:0 0 auto; nz-icon{font-size:12px;transition:transform .15s} }
    .icon{ opacity:.75; }
    .title{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .empty{ padding:16px; opacity:.6; text-align:center; }

    .footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class CollectionModalComponent {
  readonly data = inject<ApiCollectionModalData>(NZ_MODAL_DATA);
  private modalRef = inject(NzModalRef<CollectionModalComponent>);

  // state
  q = signal('');
  name = signal('');
  selectedKey = signal<Key | null>(null); // move 时使用，null=根目录

  private expandedMap = signal<Record<string, boolean>>({});

  // mode
  mode = computed(() => (this.data as any).mode ?? (this.data as any).handleType); // 兼容你旧字段，建议尽快统一为 mode

  // 只有 move 才显示树
  showParentPicker = computed(() => this.mode() === 'move' || this.mode() === 'pick');

  // create/rename 才显示 name；move 不显示 name
  showName = computed(() => this.mode() === 'create' || this.mode() === 'rename');

  iconForKind = computed(() => {
    const kind = (this.data as any).kind ?? ((this.data as any).createBody?.kind ?? 'collection');
    return kind === 'folder' ? 'folder' : kind === 'request' ? 'api' : 'database';
  });

  // init
  ngOnInit() {
    const mode = this.mode();

    if (mode === 'create') {
      const body = (this.data as ApiCollectionCreateModalData).createBody as ApiCollectionCreateBody | undefined;
      this.name.set(body?.name ?? '');
      this.selectedKey.set(null);
      return;
    }

    if (mode === 'rename' || mode === 'update') {
      const upd = this.data as ApiCollectionRenameModalData
      this.name.set((upd?.initialName ?? '') as string);
      this.selectedKey.set(null);
      return;
    }


    // move
    const initial = (this.data as ApiCollectionMoveModalData).initialParentId as string | null | undefined;
    this.selectedKey.set(initial ? (initial.startsWith('c:') ? initial : toKey(initial)) : null);

    // 默认展开一级
    const nodes = ((this.data as any).nodes ?? []) as ApiCollectionTreeNode[];
    const m: Record<string, boolean> = {};
    for (const n of nodes) m[n.key] = true;
    this.expandedMap.set(m);
  }

  // tree helpers
  expanded(key: string) { return !!this.expandedMap()[key]; }
  toggle(key: string) {
    const m = { ...this.expandedMap() };
    m[key] = !m[key];
    this.expandedMap.set(m);
  }
  select(key: Key | null) { this.selectedKey.set(key); }

  // ---------- 仅 move 场景：过滤非法父级（移动文件夹/集合时防环） ----------
  private forbiddenKeys = computed<Set<string>>(() => {
    if (this.mode() !== 'move' || this.mode() !== 'pick') return new Set();
    const t = (this.data as any).target as { kind: 'request' | 'collection' | 'folder'; id: string } | undefined;
    if (!t || t.kind === 'request') return new Set();

    const selfKey = `c:${t.id}`;
    const set = new Set<string>([selfKey]);

    const nodes = ((this.data as any).nodes ?? []) as ApiCollectionTreeNode[];

    const collect = (node: ApiCollectionTreeNode) => {
      for (const c of (node.children ?? [])) {
        if (c.kind === 'request') continue;
        set.add(c.key);
        collect(c);
      }
    };

    const walk = (arr: ApiCollectionTreeNode[]) => {
      for (const n of arr) {
        if (n.key === selfKey) collect(n);
        else if (n.children?.length) walk(n.children);
      }
    };

    walk(nodes);
    return set;
  });

  nodesForPicker = computed<ApiCollectionTreeNode[]>(() => {
    const nodes = (((this.data as any).nodes ?? []) as ApiCollectionTreeNode[])
      .filter(n => n.kind !== 'request');

    const forbid = this.forbiddenKeys();

    const prune = (arr: ApiCollectionTreeNode[]): ApiCollectionTreeNode[] => {
      const out: ApiCollectionTreeNode[] = [];
      for (const n of arr) {
        if (n.kind === 'request') continue;
        if (forbid.has(n.key)) continue;
        const children = prune(n.children ?? []);
        out.push({ ...n, children });
      }
      return out;
    };

    return prune(nodes);
  });

  filteredNodes = computed<ApiCollectionTreeNode[]>(() => {
    if (!this.showParentPicker()) return [];
    const kw = this.q().trim().toLowerCase();
    if (!kw) return this.nodesForPicker();

    const match = (n: ApiCollectionTreeNode) => (n.title ?? '').toLowerCase().includes(kw);

    const keepPath = (arr: ApiCollectionTreeNode[]): ApiCollectionTreeNode[] => {
      const out: ApiCollectionTreeNode[] = [];
      for (const n of arr) {
        const children = keepPath(n.children ?? []);
        if (match(n) || children.length) out.push({ ...n, children });
      }
      return out;
    };

    const r = keepPath(this.nodesForPicker());

    // 搜索时自动展开命中路径
    const m = { ...this.expandedMap() };
    const mark = (arr: ApiCollectionTreeNode[]) => {
      for (const n of arr) {
        if (n.children?.length) m[n.key] = true;
        if (n.children?.length) mark(n.children);
      }
    };
    mark(r);
    this.expandedMap.set(m);

    return r;
  });

  // ---------- validation ----------
  nameErr = computed(() => {
    if (!this.showName()) return '';
    const v = (this.name() ?? '').trim();
    if (!v) return '名称不能为空';
    if (v.length > 50) return '名称过长（<= 50）';
    return '';
  });

  moveErr = computed(() => {
    if (!this.showParentPicker()) return '';
    // move 必须选一个父级（允许根目录=null）
    // 这里无需额外校验；但你若要禁止把 folder 移到根，可在这加规则
    return '';
  });

  canSubmit = computed(() => {
    if (this.showName() && !!this.nameErr()) return false;
    if (this.showParentPicker()) {
      // selectedKey 默认有值（null=根）；如果你希望“必须明确选择”，可改成 selectedKey() !== undefined
      return true;
    }
    return true;
  });

  // ---------- submit ----------
  ok() {
    const mode = this.mode();

    // 兼容旧字段：update = rename
    if (mode === 'rename' || mode === 'update') {
      const data: ApiCollectionUpdateBody = { name: (this.name() ?? '').trim() };
      this.modalRef.close(data);
      return;
    }

    if (mode === 'create') {
      const body = (this.data as any).createBody as ApiCollectionCreateBody;
      const data: ApiCollectionCreateBody = {
        ...body,
        name: (this.name() ?? '').trim(),
        // parentId 不在 modal 里改：完全沿用外部传入
        parentId: body.parentId ?? null,
      };
      this.modalRef.close(data);
      return;
    }

    // move pick
    const parentId = keyToId(this.selectedKey());
    this.modalRef.close({ parentId });
  }

  cancel() {
    this.modalRef.close(null);
  }
}
