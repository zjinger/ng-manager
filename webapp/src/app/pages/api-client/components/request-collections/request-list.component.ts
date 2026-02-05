import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { ApiRequestEntity } from '@app/models/api-request.model';
import { RequestListItemComponent } from './request-list-item.component';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, NzTagModule, NzIconModule, RequestListItemComponent],
  template: `
    <div class="list">
      @for (r of requests; track r.id) {
        <app-request-list-item [r]="r" [activeId]="activeId" (select)="select.emit($event)" />
      }
      @if(!requests.length){
        <div class="empty">暂无请求</div>
      }
    </div>
  `,
  styles: [`
    .list{ display:flex; flex-direction:column; gap:8px; padding:10px; }
    
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
