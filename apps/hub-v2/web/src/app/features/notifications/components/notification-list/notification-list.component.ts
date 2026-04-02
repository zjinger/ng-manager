import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProjectContextStore } from '@core/state';
import type { NotificationItem } from '../../models/notification.model';
import { NotificationStore } from '../../store/notification.store';
import { buildNotificationRouteTarget, type NotificationRouteTarget } from '../../utils/notification-route.util';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="notification-list">
      @for (item of items(); track item.id) {
        @let target = routeTarget(item);
        <a
          class="notification-row"
          [class.notification-row--disabled]="!target.path"
          [routerLink]="target.path"
          [queryParams]="target.query"
          (click)="onItemClick($event, item, target)"
        >
          <div class="notification-row__main">
            <div class="notification-row__meta">
              <span class="notification-row__tag">{{ categoryLabel(item.category) }}</span>
              <span class="notification-row__project">{{ item.projectName }}</span>
            </div>
            <div class="notification-row__title-line">
              @if (item.unread) {
                <span class="notification-row__unread-dot"></span>
              }
              <div class="notification-row__title">{{ item.title }}</div>
            </div>
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
      .notification-row.notification-row--disabled {
        cursor: default;
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
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 700;
      }
      .notification-row__title-line {
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .notification-row__unread-dot {
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: #ef4444;
        flex: 0 0 auto;
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
  private readonly notificationStore = inject(NotificationStore);
  readonly items = input<NotificationItem[]>([]);

  routeTarget(item: NotificationItem): NotificationRouteTarget {
    return buildNotificationRouteTarget(item);
  }

  categoryLabel(category: NotificationItem['category']): string {
    return (
      {
        issue_todo: '测试单待办',
        issue_mention: '@我的评论',
        issue_activity: '测试单动态',
        rd_todo: '研发项待办',
        rd_activity: '研发项动态',
        announcement: '公告',
        document: '文档',
        release: '版本',
        project_member: '成员变更',
      }[category] || '通知'
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

  syncProjectContext(item: NotificationItem): void {
    if (!item.projectId) {
      return;
    }
    this.projectContext.setCurrentProjectId(item.projectId);
  }

  onItemClick(event: MouseEvent, item: NotificationItem, target: NotificationRouteTarget): void {
    this.syncProjectContext(item);
    this.notificationStore.markAsRead(item.id);
    if (!target.path) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
