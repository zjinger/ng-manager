import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PanelCardComponent } from '@shared/ui';
import type { RdTaskSheetAction, RdTaskSheetLogEntity } from '../../models/rd-task-sheet.model';

@Component({
  selector: 'app-rd-task-sheet-logs-panel',
  standalone: true,
  imports: [DatePipe, PanelCardComponent],
  template: `
    <app-panel-card title="操作日志" [count]="logs().length" [empty]="logs().length === 0" [emptyText]="'暂无日志'">
      <div class="log-list">
        @for (log of logs(); track log.id) {
          <div class="log-item">
            <span>{{ log.createdAt | date: 'MM-dd HH:mm' }}</span>
            <strong>{{ log.actorName || '-' }}</strong>
            <span>{{ actionLabel(log.action) }}</span>
            @if (log.comment) {
              <em>{{ log.comment }}</em>
            }
          </div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .log-list {
        display: grid;
      }
      .log-item {
        display: grid;
        grid-template-columns: 90px 90px 90px minmax(0, 1fr);
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid var(--border-color-soft);
        color: var(--text-muted);
        font-size: 13px;
      }
      .log-item:first-child {
        border-top: 0;
      }
      .log-item strong {
        color: var(--text-primary);
        font-weight: 500;
      }
      .log-item em {
        min-width: 0;
        overflow: hidden;
        color: var(--text-secondary);
        font-style: normal;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetLogsPanelComponent {
  readonly logs = input<RdTaskSheetLogEntity[]>([]);

  actionLabel(action: RdTaskSheetAction): string {
    const labels: Record<string, string> = {
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
}
