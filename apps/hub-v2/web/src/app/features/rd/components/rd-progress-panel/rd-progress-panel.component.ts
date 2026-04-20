import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { PanelCardComponent } from '@shared/ui';
import type { RdItemEntity, RdItemProgress } from '../../models/rd.model';

export interface MemberProgressItem extends RdItemProgress {
  memberName: string;
  isCurrentUser: boolean;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-rd-progress-panel',
  standalone: true,
  imports: [PanelCardComponent, NzButtonModule, NzAvatarModule, NzPopconfirmModule],
  template: `
    <app-panel-card title="成员进度">
      <div class="progress-hero">
        <div class="progress-hero__info">
          <span class="progress-hero__label">整体进度</span>
          <span class="progress-hero__hint">自动取成员平均值</span>
        </div>
        <div class="progress-hero__value">{{ mainProgress() }}%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill" [style.width.%]="mainProgress()"></div>
      </div>

      <div class="member-list">
        @for (item of memberProgressList(); track item.userId) {
          <div class="member-item">
            <div class="member-item__main">
              <div class="member-item__left">
                <nz-avatar
                  [class.member-item__avatar--default]="!item.avatarUrl"
                  [nzSize]="32"
                  nzShape="circle"
                  [nzSrc]="item.avatarUrl || undefined"
                  [nzText]="getAvatarLetter(item.memberName)"
                ></nz-avatar>
                <div class="member-item__info">
                  <span class="member-item__name">
                    {{ item.memberName }}
                    @if (item.isCurrentUser) {
                      <span class="member-item__me-tag">我</span>
                    }
                  </span>
                  <span class="member-item__time">最后更新：{{ formatTime(item.updatedAt) }}</span>
                </div>
              </div>
              <div class="member-item__right">
                <div class="progress-bar progress-bar--small">
                  <div class="progress-bar__fill" [style.width.%]="item.progress"></div>
                </div>
                <div class="member-item__actions">
                  <strong>{{ item.progress }}%</strong>
                  @if (item.isCurrentUser && !isProgressLocked()) {
                    @if (item.progress <= 0) {
                      <button
                        nz-button
                        nzType="default"
                        nzSize="small"
                        nz-popconfirm
                        nzPopconfirmTitle="确认开始处理吗？"
                        nzPopconfirmPlacement="topRight"
                        (nzOnConfirm)="onStartProgress(item)"
                      >
                        开始
                      </button>
                    } @else {
                      <button nz-button nzType="default" nzSize="small" (click)="onUpdateProgress(item)">更新</button>
                    }
                  }
                </div>
              </div>
            </div>
            @if (item.note) {
              <div class="member-item__note-row">
                <span class="member-item__note-label">进度说明：</span>
                <span class="member-item__note">{{ item.note }}</span>
              </div>
            }
          </div>
        } @empty {
          <div class="member-list__empty">暂无成员进度数据</div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .progress-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 16px 20px 12px;
      }
      .progress-hero__info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .progress-hero__label {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-heading);
      }
      .progress-hero__hint {
        font-size: 12px;
        color: var(--text-muted);
      }
      .progress-hero__value {
        font-size: 28px;
        font-weight: 800;
        color: var(--primary);
      }
      .progress-bar {
        height: 8px;
        background: var(--gray-100);
        border-radius: 999px;
        overflow: hidden;
        margin: 0 20px 16px;
      }
      .progress-bar--small {
        height: 6px;
        width: 100px;
        margin: 0;
      }
      .progress-bar__fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-500, #4f46e5), var(--primary-400, #6366f1));
        border-radius: 999px;
        transition: width 0.3s ease;
      }
      .member-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0 20px 16px;
      }
      .member-list__empty {
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
        font-size: 13px;
      }
      .member-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        background: var(--bg-subtle);
      }
      .member-item__main {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .member-item__left {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
      }
      .member-item__info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .member-item__name {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-heading);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .member-item__avatar--default{
        background: linear-gradient( 135deg, var(--primary-500), var(--primary-700));
      }
      .member-item__me-tag {
        font-size: 10px;
        background: var(--success-bg);
        color: var(--success);
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 600;
      }
      .member-item__time {
        font-size: 12px;
        color: var(--text-muted);
      }
      .member-item__note {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .member-item__right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      .member-item__actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .member-item__actions strong {
        font-size: 14px;
        color: var(--text-heading);
        min-width: 36px;
        text-align: right;
      }
      .member-item__note-row {
        width: 100%;
        border-top: 1px dashed var(--border-color-soft);
        padding-top: 8px;
        display: flex;
        gap: 4px;
      }
      .member-item__note-label {
        flex: 0 0 auto;
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdProgressPanelComponent {
  readonly item = input<RdItemEntity | null>(null);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly currentUserId = input<string>('');

  readonly updateProgressClick = output<{ userId: string; memberName: string; currentProgress: number; quickStart?: boolean }>();

  mainProgress(): number {
    return this.item()?.progress ?? 0;
  }

  isProgressLocked(): boolean {
    const status = this.item()?.status;
    return status === 'accepted' || status === 'closed';
  }

  getAvatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  formatTime(isoString: string): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onUpdateProgress(item: MemberProgressItem): void {
    if (this.isProgressLocked()) {
      return;
    }
    this.updateProgressClick.emit({
      userId: item.userId,
      memberName: item.memberName,
      currentProgress: item.progress,
    });
  }

  onStartProgress(item: MemberProgressItem): void {
    if (this.isProgressLocked()) {
      return;
    }
    this.updateProgressClick.emit({
      userId: item.userId,
      memberName: item.memberName,
      currentProgress: 1,
      quickStart: true,
    });
  }
}
