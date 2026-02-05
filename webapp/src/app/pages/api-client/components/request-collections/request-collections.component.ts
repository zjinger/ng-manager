import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import type { ApiRequestEntity } from '@app/models/api-request.model';
import { RequestListComponent } from './request-list.component';

@Component({
  selector: 'app-request-collections',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule, RequestListComponent],
  template: `
    <div class="wrap">
      <div class="header">
        <nz-input-wrapper>
          <nz-icon class="search-icon" nzInputPrefix nzType="search" />
          <input
            nz-input
            placeholder="搜索"
            [ngModel]="keyword()"
            (ngModelChange)="keyword.set($event)"
          />
        </nz-input-wrapper>
        <button nz-button (click)="reload.emit()" nzType="text">
          <nz-icon [nzType]="loading ? 'loading' : 'reload'" nzTheme="outline" />
        </button>
        <button nz-button (click)="create.emit()" nzType="text">
          <nz-icon nzType="plus" nzTheme="outline" />
        </button>
      </div>
      <div class="body">
        <app-request-list
          [requests]="filtered()"
          [activeId]="activeId"
          (select)="select.emit($event)"
        />
      </div>
    </div>
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

  @Input() activeId: string | null = null;
  @Input() loading: boolean = false;

  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();

  keyword = signal('');

  filtered = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    if (!kw) return this.requests();

    return (this.requests() ?? []).filter(r => {
      const name = (r.name ?? '').toLowerCase();
      const url = (r.url ?? '').toLowerCase();
      return name.includes(kw) || url.includes(kw);
    });
  });

}
