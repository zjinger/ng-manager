import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import type { AnnouncementEntity } from '../../models/content.model';

@Component({
  selector: 'app-announcement-list',
  standalone: true,
  imports: [DatePipe, NzButtonModule, DataTableComponent],
  template: `
    <app-data-table>
      <div table-head class="content-table__head">
        <div>标题</div>
        <div>范围</div>
        <div>状态</div>
        <div>发布时间</div>
        <div>更新时间</div>
        <div>操作</div>
      </div>
      <div table-body class="content-table__body">
        @for (item of items(); track item.id) {
          <div class="content-row">
            <div class="content-cell content-cell--title">
              <div class="content-title">{{ item.title }}</div>
              <div class="content-meta">{{ item.summary || '暂无摘要' }}</div>
            </div>
            <div class="content-cell">{{ item.scope === 'global' ? '全局' : '项目' }}</div>
            <div class="content-cell">{{ statusLabel(item.status) }}</div>
            <div class="content-cell content-cell--muted">{{ item.publishAt ? (item.publishAt | date: 'MM-dd HH:mm') : '未发布' }}</div>
            <div class="content-cell content-cell--muted">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
            <div class="content-cell content-cell--actions">
              <button nz-button nzSize="small" (click)="edit.emit(item)">编辑</button>
              @if (item.status === 'draft') {
                <button nz-button nzType="primary" nzSize="small" (click)="publish.emit(item)">发布</button>
              }
            </div>
          </div>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .content-table__head,
      .content-row {
        display: grid;
        grid-template-columns: 2fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr;
        gap: 16px;
        align-items: center;
      }
      .content-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .content-row {
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
      }
      .content-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .content-title {
        font-weight: 700;
        color: var(--text-heading);
      }
      .content-meta,
      .content-cell--muted {
        font-size: 12px;
        color: var(--text-muted);
      }
      .content-meta {
        margin-top: 4px;
      }
      .content-cell--actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      @media (max-width: 1100px) {
        .content-table__head {
          display: none;
        }
        .content-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementListComponent {
  readonly items = input<AnnouncementEntity[]>([]);
  readonly edit = output<AnnouncementEntity>();
  readonly publish = output<AnnouncementEntity>();

  statusLabel(status: string): string {
    return (
      {
        draft: '草稿',
        published: '已发布',
        archived: '已归档',
      }[status] ?? status
    );
  }
}
