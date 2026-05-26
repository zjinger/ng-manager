import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { UserEntity } from '../../models/user.model';

@Component({
  selector: 'app-user-history-tab',
  imports: [NzIconModule],
  template: `
    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="history" nzTheme="outline" />
        最近记录
      </div>
      <div class="timeline">
        @for (item of timeline(); track item.title + item.meta) {
          <div class="timeline-item">
            <div class="timeline-item__icon">
              <nz-icon [nzType]="item.icon" nzTheme="outline" />
            </div>
            <div class="timeline-item__content">
              <strong>{{ item.title }}</strong>
              <span class="timeline-item__meta">{{ item.meta }}</span>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .user-form-section {
      display: flex;
      flex-direction: column;
    }

    .user-form-section__title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .user-form-section__title nz-icon {
      color: var(--color-primary);
    }

    .timeline {
      display: grid;
    }

    .timeline-item {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
      gap: 12px;
      padding: 14px 0;
      border-top: 1px solid var(--border-color-soft);
    }

    .timeline-item:first-child {
      border-top: 0;
      padding-top: 0;
    }

    .timeline-item__icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--bg-subtle);
      color: var(--color-primary);
    }

    .timeline-item__content {
      display: grid;
      gap: 4px;
    }

    .timeline-item__content strong {
      color: var(--text-primary);
      font-size: 14px;
    }

    .timeline-item__meta {
      color: var(--text-muted);
      font-size: 12px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserHistoryTabComponent {
  readonly user = input.required<UserEntity>();

  readonly timeline = computed(() => {
    const currentUser = this.user();
    return [
      {
        icon: 'user',
        title: `创建用户档案：${currentUser.displayName || currentUser.username}`,
        meta: `创建于 ${this.shortDateTime(currentUser.createdAt)}`,
      },
      {
        icon: 'edit',
        title: '最近一次资料更新',
        meta: `更新时间 ${this.shortDateTime(currentUser.updatedAt)}`,
      },
      {
        icon: 'login',
        title: currentUser.lastLoginAt ? '最近一次登录' : '暂无登录记录',
        meta: currentUser.lastLoginAt
          ? `登录于 ${this.shortDateTime(currentUser.lastLoginAt)}`
          : '该用户尚未完成后台登录',
      },
    ];
  });

  private shortDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}
