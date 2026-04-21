import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProjectContextStore } from '@core/state';
import type { NotificationItem } from '../../models/notification.model';
import { NotificationStore } from '../../store/notification.store';
import { buildNotificationRouteTarget, type NotificationRouteTarget } from '../../utils/notification-route.util';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="notification-menu">
      <div class="notification-menu__header">
        <div>
          <strong>通知中心</strong>
          <span>最新待办和动态</span>
        </div>
        <div class="notification-menu__header-side">
          <a class="notification-menu__all" [routerLink]="['/notifications']" (click)="requestClose()">查看全部</a>
          <span class="notification-menu__count">{{ formatTotalCount(totalCount() ?? items().length) }}</span>
        </div>
      </div>

      @if (items().length === 0) {
        <div class="notification-menu__empty">当前没有新通知</div>
      } @else {
        <div class="notification-menu__list">
          @for (item of items(); track item.id) {
            @let target = routeTarget(item);
            <a
              class="notification-item"
              [class.notification-item--disabled]="!target.path"
              [routerLink]="target.path"
              [queryParams]="target.query"
              (click)="onItemClick($event, item, target)"
            >
              <div class="notification-item__body">
                <div class="notification-item__meta">
                  <span
                    class="notification-item__tag"
                >
                  {{ categoryLabel(item.category) }}
                </span>
                  <span class="notification-item__project">{{ item.projectName }}</span>
                  <span class="notification-item__time-mobile">{{ formatRelativeTime(item.time) }}</span>
                </div>
                <div class="notification-item__title-line">
                  @if (item.unread) {
                    <span class="notification-item__unread-dot"></span>
                  }
                  <div class="notification-item__title">{{ item.title }}</div>
                </div>
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
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        padding: 14px 16px;
        text-decoration: none;
        color: inherit;
        border-bottom: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }
      .notification-item:hover {
        background: var(--bg-subtle);
      }
      .notification-item.notification-item--disabled {
        cursor: default;
      }
      .notification-item__title {
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.4;
      }
      .notification-item__title-line {
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .notification-item__unread-dot {
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: #ef4444;
        flex: 0 0 auto;
      }
      .notification-item__desc {
        margin-top: 4px;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
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
        flex: 0 0 auto;
        height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: rgba(79, 70, 229, 0.12);
        color: var(--primary-700);
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .notification-item__project {
        min-width: 0;
        color: var(--text-muted);
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .notification-item__time-mobile {
        display: none;
        color: var(--text-muted);
        font-size: 11px;
      }
      @media (max-width: 640px) {
        .notification-item {
          grid-template-columns: minmax(0, 1fr);
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
  private readonly projectContext = inject(ProjectContextStore);
  private readonly notificationStore = inject(NotificationStore);
  readonly items = input<NotificationItem[]>([]);
  readonly totalCount = input<number | null>(null);
  readonly closeRequested = output<void>();

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
    this.requestClose();
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  formatTotalCount(value: number): string {
    const total = Math.max(0, Math.floor(Number(value) || 0));
    return total > 999 ? '999+' : `${total}`;
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
