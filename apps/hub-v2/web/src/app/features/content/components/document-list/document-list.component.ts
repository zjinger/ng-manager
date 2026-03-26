import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DataTableComponent } from '@shared/ui';
import type { DocumentEntity } from '../../models/content.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [DatePipe, DataTableComponent],
  template: `
    <app-data-table>
      <div table-head class="content-table__head">
        <div>文档</div>
        <div>分类</div>
        <div>版本</div>
        <div>状态</div>
        <div>更新时间</div>
      </div>
      <div table-body class="content-table__body">
        @for (item of items(); track item.id) {
          <button
            type="button"
            class="content-row"
            [class.is-active]="selectedId() === item.id"
            (click)="select.emit(item)"
          >
            <div class="content-cell content-cell--title">
              <div class="content-title">{{ item.title }}</div>
              <div class="content-meta">{{ item.summary || item.slug }}</div>
            </div>
            <div class="content-cell">{{ item.category || '未分类' }}</div>
            <div class="content-cell">{{ item.version || '-' }}</div>
            <div class="content-cell">
              <span
                class="content-status-tag"
                [class.status-draft]="item.status === 'draft'"
                [class.status-published]="item.status === 'published'"
                [class.status-archived]="item.status === 'archived'"
              >
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <div class="content-cell content-cell--muted">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
          </button>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .content-table__head,
      .content-row {
        display: grid;
        grid-template-columns: 2fr 1fr 0.8fr 0.8fr 0.9fr;
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
        width: 100%;
        border: 0;
        text-align: left;
        background: transparent;
        color: inherit;
        border-bottom: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
        cursor: pointer;
      }
      .content-row:last-child {
        border-bottom: 0;
      }
      .content-row:hover {
        background: var(--bg-subtle);
      }
      .content-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle);
        box-shadow: inset 3px 0 0 var(--primary-600);
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
      .content-status-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 60px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 12px;
        line-height: 18px;
        border: 1px solid transparent;
      }
      .content-status-tag.status-draft {
        background: color-mix(in srgb, var(--gray-500) 14%, transparent);
        color: var(--text-muted);
        border-color: color-mix(in srgb, var(--gray-500) 20%, transparent);
      }
      .content-status-tag.status-published {
        background: color-mix(in srgb, var(--color-success) 14%, transparent);
        color: color-mix(in srgb, var(--color-success) 78%, #0f172a);
        border-color: color-mix(in srgb, var(--color-success) 24%, transparent);
      }
      .content-status-tag.status-archived {
        background: color-mix(in srgb, var(--color-warning) 14%, transparent);
        color: color-mix(in srgb, var(--color-warning) 78%, #0f172a);
        border-color: color-mix(in srgb, var(--color-warning) 24%, transparent);
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
      :host-context(html[data-theme='dark']) .content-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentListComponent {
  readonly items = input<DocumentEntity[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly select = output<DocumentEntity>();

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
