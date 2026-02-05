import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import type { ApiHistoryEntity } from '@models/api-client/api-history.model';

@Component({
  selector: 'app-api-history-drawer',
  standalone: true,
  imports: [
    CommonModule,
    NzDrawerModule,
    NzButtonModule,
    NzSpinModule,
    NzTagModule,
  ],
  template: `
    <nz-drawer
      nzTitle="请求历史"
      [nzVisible]="true"
      nzPlacement="right"
      [nzWidth]="520"
      (nzOnClose)="close.emit()"
    >
      <ng-container *nzDrawerContent>
      @if(loading){
        <nz-spin />
      } @else {
        <div class="list">
          @for (h of histories; track h.id) {
            <div class="item">
              <div class="row">
                <nz-tag>{{h.requestSnapshot.method}}</nz-tag>
                <span class="url">{{h.requestSnapshot.url}}</span>
              </div>

              <div class="meta">
                <span>{{h.metrics.durationMs}} ms</span>
                @if(h.response){
                  <nz-tag>HTTP {{h.response.status}}</nz-tag>
                }
                @if(h.error){
                  <nz-tag nzColor="red">ERR</nz-tag>
                }
              </div>

              <div class="actions">
                <button nz-button nzSize="small" (click)="replay.emit(h)">重放</button>
                @if(h.resolved.curl){
                  <button nz-button nzSize="small" (click)="copy(h.resolved.curl.bash)">curl</button>
                }
              </div>
            </div>
          }

          @if(!histories.length){
            <div class="empty">暂无历史记录</div>
          }
        </div>
      }
      </ng-container>
    </nz-drawer>
  `,
  styles: [`
    .list{
      display:flex;
      flex-direction:column;
      gap:12px;
    }
    .item{
      border:1px solid #f0f0f0;
      border-radius:8px;
      padding:10px;
    }
    .row{
      display:flex;
      gap:8px;
      align-items:center;
      font-weight:500;
    }
    .url{
      flex:1;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .meta{
      margin-top:6px;
      display:flex;
      gap:8px;
      font-size:12px;
      opacity:.7;
    }
    .actions{
      margin-top:8px;
      display:flex;
      gap:8px;
    }
    .empty{
      padding:16px;
      opacity:.6;
      text-align:center;
    }
  `],
})
export class ApiHistoryDrawerComponent {
  @Input() loading = false;
  @Input() histories: ApiHistoryEntity[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() replay = new EventEmitter<ApiHistoryEntity>();

  copy(text: string) {
    navigator.clipboard.writeText(text);
  }
}
