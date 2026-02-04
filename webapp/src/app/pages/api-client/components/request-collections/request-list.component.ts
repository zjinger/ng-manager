import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { ApiRequestEntity } from '@app/models/api-request.model';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, NzTagModule, NzIconModule],
  template: `
    <div class="list">
      @for (r of requests; track r.id) {
        <div class="item" [class.active]="r.id===activeId" (click)="select.emit(r.id)">
          <div class="row1">
            <nz-tag class="method">{{r.method}}</nz-tag>
            <span class="name">{{r.name || 'Untitled'}}</span>
          </div>

          <div class="row2">
            <span class="url">{{r.url}}</span>
          </div>

          <div class="row3">
            <span class="time">{{r.updatedAt ? (r.updatedAt | date:'MM-dd HH:mm') : ''}}</span>
          </div>
        </div>
      }

      @if(!requests.length){
        <div class="empty">暂无请求</div>
      }
    </div>
  `,
  styles: [`
    .list{ display:flex; flex-direction:column; gap:8px; padding:10px; }
    .item{
      border:1px solid #f0f0f0;
      border-radius:10px;
      padding:10px;
      cursor:pointer;
      transition: background .15s, border-color .15s;
    }
    .item.active{
      background:#f5f5f5;
      border-color:#d9d9d9;
    }
    .row1{ display:flex; gap:8px; align-items:center; }
    .method{ margin:0; }
    .name{
      font-weight:600;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      flex:1;
      min-width:0;
    }
    .row2{ margin-top:6px; font-size:12px; opacity:.75; }
    .url{
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      display:block;
    }
    .row3{ margin-top:6px; font-size:12px; opacity:.55; }
    .empty{ padding:16px; opacity:.6; text-align:center; }
  `],
})
export class RequestListComponent {
  @Input() requests: ApiRequestEntity[] = [];
  @Input() activeId: string | null = null;

  @Output() select = new EventEmitter<string>();
}
