import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { DataTableComponent } from '@shared/ui';
import { USER_TITLE_OPTIONS, type UserEntity, type UserTitleCode } from '../../models/user.model';
import { UserStatusTagComponent } from '../user-status-tag/user-status-tag.component';

@Component({
  selector: 'app-user-list-table',
  standalone: true,
  imports: [DatePipe, DataTableComponent, UserStatusTagComponent],
  template: `
    <app-data-table>
      <div table-head class="user-table__head">
        <div>用户</div>
        <div>邮箱</div>
        <div>手机号</div>
        <div>职能</div>
        <div>状态</div>
        <div>更新时间</div>
        <div>操作</div>
      </div>
      <div table-body class="user-table__body">
        @for (item of items(); track item.id) {
          <div class="user-row">
            <div class="user-cell user-cell--user">
              <div class="user-avatar">
                @if (showAvatarImage(item)) {
                  <img [src]="item.avatarUrl!" [alt]="item.displayName || item.username" (error)="markAvatarError(item.id)" />
                } @else {
                  <span>{{ avatarText(item.displayName || item.username) }}</span>
                }
              </div>
              <div>
                <div class="user-name">{{ item.displayName || item.username }}</div>
                <div class="user-meta">{{ item.username }}</div>
              </div>
            </div>
            <div class="user-cell">{{ item.email || '—' }}</div>
            <div class="user-cell">{{ item.mobile || '—' }}</div>
            <div class="user-cell">{{ titleLabel(item.titleCode) }}</div>
            <div class="user-cell"><app-user-status-tag [status]="item.status" /></div>
            <div class="user-cell user-cell--muted">{{ item.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</div>
            <div class="user-cell">
              <button class="edit-btn" type="button" (click)="edit.emit(item)">编辑</button>
            </div>
          </div>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .user-table__head,
      .user-row {
        display: grid;
        grid-template-columns: 1.5fr 1.2fr 1fr 0.8fr 0.8fr 0.9fr 0.6fr;
        gap: 16px;
        align-items: center;
      }
      .user-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .user-row {
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        transition: background 0.2s ease;
      }
      .user-row:hover {
        background: var(--bg-subtle);
      }
      .user-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .user-cell--user {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        overflow: hidden;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        flex-shrink: 0;
      }
      .user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .user-name {
        font-weight: 600;
        color: var(--text-heading);
      }
      .user-meta,
      .user-cell--muted {
        font-size: 12px;
        color: var(--text-muted);
      }
      .edit-btn {
        border: 0;
        background: transparent;
        color: var(--primary-600);
        font-weight: 600;
        cursor: pointer;
      }
      @media (max-width: 1100px) {
        .user-table__head {
          display: none;
        }
        .user-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListTableComponent {
  readonly items = input.required<UserEntity[]>();
  readonly edit = output<UserEntity>();
  private readonly brokenAvatarMap = signal<Record<string, true>>({});

  avatarText(name: string): string {
    return name.slice(0, 1);
  }

  showAvatarImage(item: UserEntity): boolean {
    return !!item.avatarUrl && !this.brokenAvatarMap()[item.id];
  }

  markAvatarError(userId: string): void {
    this.brokenAvatarMap.update((state) => ({ ...state, [userId]: true }));
  }

  titleLabel(titleCode: UserTitleCode | null): string {
    if (!titleCode) {
      return '—';
    }
    return USER_TITLE_OPTIONS.find((item) => item.value === titleCode)?.label ?? titleCode;
  }
}
