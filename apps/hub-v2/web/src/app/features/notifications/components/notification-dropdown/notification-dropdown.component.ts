import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { NotificationItem } from '../../models/notification.model';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="notification-menu">
      <div class="notification-menu__header">
        <div>
          <strong>通知中心</strong>
          <span>最新待办、动态和公告</span>
        </div>
        <div class="notification-menu__header-side">
          <a class="notification-menu__all" [routerLink]="['/notifications']">查看全部</a>
          <span class="notification-menu__count">{{ items().length }}</span>
        </div>
      </div>

      @if (items().length === 0) {
        <div class="notification-menu__empty">当前没有新通知</div>
      } @else {
        <div class="notification-menu__list">
          @for (item of items(); track item.id) {
            <a
              class="notification-item"
              [class.is-unread]="item.unread"
              [routerLink]="routeTarget(item.route).path"
              [queryParams]="routeTarget(item.route).query"
            >
              <span class="notification-item__dot" [class.is-activity]="item.kind === 'activity'" [class.is-announcement]="item.kind === 'announcement'"></span>
              <div class="notification-item__body">
                <div class="notification-item__meta">
                  <span
                    class="notification-item__tag"
                    [class.is-activity]="item.kind === 'activity'"
                    [class.is-announcement]="item.kind === 'announcement'"
                >
                  {{ kindLabel(item.kind) }}
                </span>
                  <span class="notification-item__project">{{ item.projectName }}</span>
                  <span class="notification-item__time-mobile">{{ formatRelativeTime(item.time) }}</span>
                </div>
                <div class="notification-item__title">{{ item.title }}</div>
                <div class="notification-item__desc">{{ item.description }}</div>
              </div>
              <div class="notification-item__time">
                <div>{{ formatRelativeTime(item.time) }}</div>
                <span>{{ formatAbsoluteTime(item.time) }}</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .notification-menu {
        width: 360px;
        max-width: calc(100vw - 24px);
        border-radius: 18px;
        background: var(--surface-elevated);
        overflow: hidden;
      }
      .notification-menu__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 16px 14px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .notification-menu__header strong {
        display: block;
        color: var(--text-primary);
        font-size: 14px;
      }
      .notification-menu__header span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .notification-menu__count {
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(79, 70, 229, 0.12);
        color: var(--primary-700);
        font-weight: 700;
      }
      .notification-menu__header-side {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .notification-menu__all {
        color: var(--primary-700);
        font-size: 12px;
        font-weight: 700;
      }
      .notification-menu__empty {
        padding: 28px 16px;
        text-align: center;
        color: var(--text-muted);
      }
      .notification-menu__list {
        max-height: 420px;
        overflow: auto;
      }
      .notification-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 12px;
        padding: 14px 16px;
        text-decoration: none;
        color: inherit;
        border-bottom: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }
      .notification-item:hover {
        background: var(--bg-subtle);
      }
      .notification-item.is-unread {
        background: linear-gradient(90deg, rgba(79, 70, 229, 0.08), transparent 72%);
      }
      .notification-item__dot {
        width: 9px;
        height: 9px;
        margin-top: 7px;
        border-radius: 999px;
        background: var(--primary-600);
      }
      .notification-item__dot.is-activity {
        background: var(--color-info);
      }
      .notification-item__dot.is-announcement {
        background: var(--color-warning);
      }
      .notification-item__title {
        margin-top: 6px;
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.4;
      }
      .notification-item__desc {
        margin-top: 4px;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.5;
      }
      .notification-item__time {
        color: var(--text-muted);
        font-size: 11px;
        white-space: nowrap;
        text-align: right;
        display: grid;
        gap: 4px;
      }
      .notification-item__time span {
        color: var(--text-tertiary, var(--text-muted));
      }
      .notification-item__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .notification-item__tag {
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
      .notification-item__tag.is-activity {
        background: rgba(14, 165, 233, 0.12);
        color: var(--color-info);
      }
      .notification-item__tag.is-announcement {
        background: rgba(245, 158, 11, 0.14);
        color: var(--color-warning);
      }
      .notification-item__project {
        color: var(--text-muted);
        font-size: 11px;
      }
      .notification-item__time-mobile {
        display: none;
        color: var(--text-muted);
        font-size: 11px;
      }
      @media (max-width: 640px) {
        .notification-item {
          grid-template-columns: auto minmax(0, 1fr);
        }
        .notification-item__time {
          display: none;
        }
        .notification-item__time-mobile {
          display: inline;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationDropdownComponent {
  readonly items = input<NotificationItem[]>([]);

  routeTarget(route: string): { path: string[]; query?: Record<string, string> } {
    const [path, query = ''] = route.split('?');
    if (!query) {
      return { path: [path] };
    }
    const params = new URLSearchParams(query);
    const queryParams: Record<string, string> = {};
    params.forEach((value, key) => {
      queryParams[key] = value;
    });
    return { path: [path], query: queryParams };
  }

  kindLabel(kind: NotificationItem['kind']): string {
    return (
      {
        todo: '待办',
        activity: '动态',
        announcement: '公告',
      }[kind] || '通知'
    );
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
}
