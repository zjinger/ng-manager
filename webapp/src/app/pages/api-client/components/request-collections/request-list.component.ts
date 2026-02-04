import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';

import type { ApiRequestEntity } from '@app/models/api-request.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzTagModule],
  template: `
    <div class="wrap">
      <div class="top">
        <input nz-input placeholder="搜索请求" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      </div>

      <div class="list">
        @for (item of filtered(); track item.id) {
          <div class="row" [class.active]="item.id===activeId" (click)="select.emit(item.id)">
            <nz-tag class="method">{{item.method}}</nz-tag>
            <div class="meta">
              <div class="name">{{item.name}}</div>
              <div class="url">{{item.url}}</div>
            </div>
          </div>
        }
        @if(!filtered().length){
          <div class="empty">暂无请求</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap{ display:flex; flex-direction:column; height:100%; }
    .top{ padding:10px; border-bottom:1px solid #f0f0f0; }
    .list{ flex:1 1 auto; overflow:auto; }
    .row{
      display:flex; gap:10px; padding:10px;
      border-bottom:1px solid #f7f7f7;
      cursor:pointer;
    }
    .row.active{ background:#f5f5f5; }
    .method{ flex:0 0 auto; }
    .meta{ min-width:0; }
    .name{ font-weight:600; }
    .url{ font-size:12px; opacity:.75; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:220px;}
    .empty{ padding:16px; opacity:.6; }
  `],
})
export class RequestListComponent {
  @Input() items: ApiRequestEntity[] = [];
  @Input() activeId: string | null = null;
  @Output() select = new EventEmitter<string>();

  q = signal('');

  filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter(x =>
      (x.name ?? '').toLowerCase().includes(q) ||
      (x.url ?? '').toLowerCase().includes(q) ||
      (x.method ?? '').toLowerCase().includes(q)
    );
  });
}
