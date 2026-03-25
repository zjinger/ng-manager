import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProjectContextStore } from '../../../../core/state/project-context.store';
import type { NotificationItem } from '../../models/notification.model';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="notification-list">
      @for (item of items(); track item.id) {
        <a
          class="notification-row"
          [class.is-unread]="item.unread"
          [routerLink]="routeTarget(item).path"
          [queryParams]="routeTarget(item).query"
          (click)="syncProjectContext(item)"
        >
          <div class="notification-row__main">
            <div class="notification-row__meta">
              <span class="notification-row__tag">{{ item.sourceLabel }}</span>
              <span class="notification-row__project">{{ item.projectName }}</span>
            </div>
            <div class="notification-row__title">{{ item.title }}</div>
            <div class="notification-row__desc">{{ item.description }}</div>
          </div>
          <div class="notification-row__time">
            <div>{{ formatRelativeTime(item.time) }}</div>
            <span>{{ formatAbsoluteTime(item.time) }}</span>
          </div>
        </a>
      }
    </div>
  `,
  styles: [
    `
      .notification-list {
        display: grid;
        border: 1px solid var(--border-color);
        border-radius: 20px;
        background: var(--bg-container);
        overflow: hidden;
      }
      .notification-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        padding: 18px 20px;
        text-decoration: none;
        color: inherit;
        border-bottom: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }
      .notification-row:last-child {
        border-bottom: 0;
      }
      .notification-row:hover {
        background: var(--bg-subtle);
      }
      .notification-row.is-unread {
        background: linear-gradient(90deg, rgba(79, 70, 229, 0.08), transparent 68%);
      }
      .notification-row__meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .notification-row__tag {
        display: inline-flex;
        align-items: center;
        height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: rgba(79, 70, 229, 0.12);
        color: var(--primary-700);
        font-size: 11px;
        font-weight: 700;
      }
      .notification-row__project {
        color: var(--text-muted);
        font-size: 12px;
      }
      .notification-row__title {
        margin-top: 8px;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 700;
      }
      .notification-row__desc {
        margin-top: 6px;
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.6;
      }
      .notification-row__time {
        min-width: 84px;
        color: var(--text-muted);
        font-size: 12px;
        text-align: right;
        display: grid;
        gap: 6px;
      }
      .notification-row__time span {
        font-size: 11px;
      }
      @media (max-width: 720px) {
        .notification-row {
          grid-template-columns: 1fr;
        }
        .notification-row__time {
          text-align: left;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationListComponent {
  private readonly projectContext = inject(ProjectContextStore);
  readonly items = input<NotificationItem[]>([]);

  routeTarget(item: NotificationItem): { path: string[]; query?: Record<string, string> } {
    const route = item.route || '';
    const [path, query = ''] = route.split('?');
    const params = new URLSearchParams(query);
    const queryParams: Record<string, string> = {};
    params.forEach((value, key) => {
      queryParams[key] = value;
    });

    if (!queryParams['detail'] && path === '/rd') {
      const entityId = this.resolveEntityId(item);
      if (entityId) {
        queryParams['detail'] = entityId;
      }
    }

    if (!queryParams['detail'] && path === '/issues') {
      const entityId = this.resolveEntityId(item);
      if (entityId) {
        queryParams['detail'] = entityId;
      }
    }

    return Object.keys(queryParams).length > 0 ? { path: [path], query: queryParams } : { path: [path] };
  }

  private resolveEntityId(item: NotificationItem): string | null {
    if (!item?.id) {
      return null;
    }
    const parts = item.id.split(':');
    if (parts.length < 3) {
      return null;
    }
    if (parts[0] === 'todo') {
      return parts[2] || null;
    }
    if (parts[0] === 'activity') {
      return parts[2] || null;
    }
    return null;
  }

  formatRelativeTime(value: string): string {
    if (!value) {
      return '刚刚';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const diff = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < hour) {
      return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
    }
    if (diff < day) {
      return `${Math.floor(diff / hour)} 小时前`;
    }
    if (diff < 7 * day) {
      return `${Math.floor(diff / day)} 天前`;
    }
    return this.formatAbsoluteTime(value);
  }

  formatAbsoluteTime(value: string): string {
    if (!value) {
      return '刚刚';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    const hh = `${date.getHours()}`.padStart(2, '0');
    const mi = `${date.getMinutes()}`.padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  }

  syncProjectContext(item: NotificationItem): void {
    if (!item.projectId) {
      return;
    }
    this.projectContext.setCurrentProjectId(item.projectId);
  }
}
