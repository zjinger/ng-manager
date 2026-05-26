import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PanelCardComponent } from '@shared/ui';
import type { RdTaskSheetAction, RdTaskSheetLogEntity } from '../../models/rd-task-sheet.model';

interface TaskSheetTimelineItem {
  id: string;
  icon: string;
  actor: string;
  action: string;
  comment: string;
  time: string;
}

@Component({
  selector: 'app-rd-task-sheet-logs-panel',
  standalone: true,
  imports: [NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card title="操作日志" [count]="logs().length" [empty]="logs().length === 0" [emptyText]="'暂无日志'">
      <div class="timeline">
        @for (item of timelineItems(); track item.id) {
          <div class="timeline-log">
            <span nz-icon [nzType]="item.icon" class="timeline-log__icon"></span>
            <div class="timeline-log__body">
              <div class="timeline-log__note">
                <span class="timeline-log__user">{{ item.actor }}</span>
                <span class="timeline-log__action">{{ item.action }}</span>
                @if (item.comment) {
                  <span class="timeline-log__comment">{{ item.comment }}</span>
                }
              </div>
            </div>
            <span class="timeline-log__time">{{ item.time }}</span>
          </div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .timeline {
        display: grid;
        max-height: 420px;
        overflow: auto;
      }
      .timeline-log {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        font-size: 13px;
      }
      .timeline-log:first-child {
        border-top: 0;
      }
      .timeline-log__icon,
      .timeline-log__time {
        flex: 0 0 auto;
      }
      .timeline-log__icon {
        margin-top: 4px;
        color: var(--primary-500);
        font-size: 14px;
      }
      .timeline-log__body {
        min-width: 0;
        flex: 1 1 auto;
      }
      .timeline-log__note {
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        background: var(--bg-container);
        color: var(--text-secondary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .timeline-log__user {
        margin-right: 6px;
        color: var(--text-primary);
        font-weight: 600;
      }
      .timeline-log__action {
        color: var(--text-secondary);
      }
      .timeline-log__comment {
        display: block;
        margin-top: 4px;
        color: var(--text-primary);
      }
      .timeline-log__time {
        margin-left: auto;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.6;
        white-space: nowrap;
      }
      @media (max-width: 768px) {
        .timeline {
          max-height: 52vh;
        }
        .timeline-log {
          flex-wrap: wrap;
        }
        .timeline-log__body {
          flex-basis: calc(100% - 22px);
        }
        .timeline-log__time {
          width: 100%;
          margin-left: 22px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetLogsPanelComponent {
  readonly logs = input<RdTaskSheetLogEntity[]>([]);

  readonly timelineItems = computed<TaskSheetTimelineItem[]>(() =>
    this.sortedLogs().map((log) => ({
      id: log.id,
      icon: this.iconType(log.action),
      actor: log.actorName || '系统',
      action: this.actionLabel(log.action),
      comment: log.comment || '',
      time: this.formatTime(log.createdAt),
    })),
  );

  actionLabel(action: RdTaskSheetAction): string {
    const labels: Record<RdTaskSheetAction, string> = {
      create: '创建',
      update: '更新',
      issue: '下发',
      start_processing: '开始处理',
      reply: '回复',
      close: '关闭',
      'attachment.added': '添加附件',
      'attachment.removed': '删除附件',
      'convert.rd_item': '转研发项',
      'convert.issue': '转测试单',
    };
    return labels[action] ?? action;
  }

  private iconType(action: RdTaskSheetAction): string {
    const icons: Record<RdTaskSheetAction, string> = {
      create: 'plus-circle',
      update: 'edit',
      issue: 'send',
      start_processing: 'play-circle',
      reply: 'message',
      close: 'close-circle',
      'attachment.added': 'paper-clip',
      'attachment.removed': 'delete',
      'convert.rd_item': 'branches',
      'convert.issue': 'bug',
    };
    return icons[action] ?? 'clock-circle';
  }

  private sortedLogs(): RdTaskSheetLogEntity[] {
    return this.logs()
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const leftTime = Date.parse(left.item.createdAt);
        const rightTime = Date.parse(right.item.createdAt);
        const leftTs = Number.isFinite(leftTime) ? leftTime : Number.NEGATIVE_INFINITY;
        const rightTs = Number.isFinite(rightTime) ? rightTime : Number.NEGATIVE_INFINITY;
        if (leftTs !== rightTs) {
          return rightTs - leftTs;
        }
        return left.index - right.index;
      })
      .map((entry) => entry.item);
  }

  private formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}
