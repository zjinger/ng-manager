import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { NoticeDetail } from '../../models/notice.model';
import { DataTableComponent } from '@shared/ui';

@Component({
  selector: 'app-notice-list',
  standalone: true,
  imports: [DatePipe, DataTableComponent],

  template: `
    <app-data-table>
      <!-- 表头 -->
      <div table-head class="notice-table__head">
        <div>公告标题</div>
        <div>公告类型</div>
        <div>可见范围</div>
        <div>状态</div>
        <div>是否置顶</div>
        <div>发布人</div>
        <div>更新时间</div>
      </div>

      <!-- 表格内容 -->
      <div table-body class="notice-table__body">
        @if (!items().length) {
        <div class="notice-table__empty">暂无公告数据</div>
        } @else { @for (item of items(); track item.id) {

        <button
          type="button"
          class="notice-row"
          [class.is-active]="selectedId() === item.id"
          (click)="select.emit(item)"
        >
          <!-- 标题 -->
          <div class="notice-cell notice-cell--title">
            <div class="notice-title">{{ item.title }}</div>
          </div>

          <!-- 类型 -->
          <div class="notice-cell">
            {{ item.type }}
          </div>

          <!-- 可见范围 -->
          <div class="notice-cell">
            {{ item.visibleScope }}
          </div>

          <!-- 状态 -->
          <div class="notice-cell">
            <span
              class="notice-status-tag"
              [class.status-draft]="item.publishStatus === 'draft'"
              [class.status-published]="item.publishStatus === 'published'"
              [class.status-disabled]="item.publishStatus === 'offline'"
            >
              {{ statusLabel(item.publishStatus) }}
            </span>
          </div>

          <!-- 是否置顶 -->
          <div class="notice-cell">
            <span class="notice-pinned-tag" [class.is-pinned]="item.pinned">
              {{ item.pinned ? '置顶' : '普通' }}
            </span>
          </div>

          <!-- 发布人 -->
          <div class="notice-cell">
            {{ item.publisher }}
          </div>

          <!-- 更新时间 -->
          <div class="notice-cell notice-cell--muted">
            {{ item.updatedAt | date : 'MM-dd HH:mm' }}
          </div>
        </button>

        } }
      </div>
    </app-data-table>
  `,

  styles: [
    `
      .notice-table__head,
      .notice-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 0.9fr 0.8fr 1fr 1fr;
        gap: 16px;
        align-items: center;
      }

      .notice-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .notice-row {
        width: 100%;
        padding: 14px 16px;
        border: 0;
        text-align: left;
        background: transparent;
        color: inherit;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }

      .notice-row:last-child {
        border-bottom: 0;
      }

      .notice-row:hover {
        background: var(--bg-subtle);
      }

      .notice-row.is-active {
        background: linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle);

        box-shadow: inset 3px 0 0 var(--primary-600);
      }

      .notice-cell {
        min-width: 0;
        color: var(--text-primary);
        height: 44px;
        line-height: 44px;
      }

      .notice-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 700;
        color: var(--text-heading);
      }

      .notice-cell--muted {
        font-size: 12px;
        color: var(--text-muted);
      }

      /* 状态 */

      .notice-status-tag {
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

      .notice-status-tag.status-draft {
        background: color-mix(in srgb, var(--gray-500) 14%, transparent);
        color: var(--text-muted);
        border-color: color-mix(in srgb, var(--gray-500) 20%, transparent);
      }

      .notice-status-tag.status-published {
        background: color-mix(in srgb, var(--color-success) 14%, transparent);
        color: color-mix(in srgb, var(--color-success) 78%, #0f172a);
        border-color: color-mix(in srgb, var(--color-success) 24%, transparent);
      }

      .notice-status-tag.status-disabled {
        background: color-mix(in srgb, var(--color-warning) 14%, transparent);
        color: color-mix(in srgb, var(--color-warning) 78%, #0f172a);
        border-color: color-mix(in srgb, var(--color-warning) 24%, transparent);
      }

      /* 置顶 */

      /* .notice-pinned-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 56px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 12px;
        background: var(--bg-subtle);
        color: var(--text-muted);
      } */

      /* .notice-pinned-tag.is-pinned {
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-600);
      } */

      /* 空状态 */

      .notice-table__empty {
        padding: 48px 16px;
        text-align: center;
        color: var(--text-muted);
        font-size: 14px;
      }

      @media (max-width: 1200px) {
        .notice-table__head {
          display: none;
        }

        .notice-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }

      :host-context(html[data-theme='dark']) .notice-row.is-active {
        background: linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle);
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticeListComponent {
  // ==================== 输入 ====================

  readonly items = input<NoticeDetail[]>([]);

  readonly selectedId = input<string | null>(null);

  // ==================== 输出 ====================

  readonly select = output<NoticeDetail>();

  // ==================== 工具 ====================

  statusLabel(status: NoticeDetail['publishStatus']): string {
    return (
      {
        draft: '草稿',

        published: '已发布',

        offline: '已下线',
      }[status] ?? status
    );
  }
}
