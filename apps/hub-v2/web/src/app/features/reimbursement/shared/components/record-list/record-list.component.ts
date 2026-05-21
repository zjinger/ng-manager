import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { ReimbursementLogEntity } from '@app/features/reimbursement/models/reimbursement.model';

@Component({
  selector: 'app-record-list',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .record-list {
        display: grid;
        max-height: 560px;
        overflow: auto;
      }

      .record-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 14px 0;
        border-top: 1px solid var(--border-color-soft, #eef2f7);
        font-size: 13px;
      }

      .record-item:first-child {
        border-top: none;
      }

      .record-icon,
      .record-time {
        flex: 0 0 auto;
      }

      .record-icon {
        margin-top: 4px;
        color: var(--primary-500, #4f46e5);
        font-size: 14px;
      }

      .record-body {
        min-width: 0;
        flex: 1 1 auto;
      }

      .record-operator {
        margin-right: 6px;
        font-weight: 600;
        color: var(--text-primary, #0f172a);
      }

      .record-content {
        line-height: 1.7;
        color: var(--text-primary, #0f172a);
        word-break: break-word;
      }

      .record-action {
        color: var(--text-secondary, #475569);
      }

      .record-comment {
        white-space: pre-wrap;
      }

      .record-time {
        margin-left: auto;
        font-size: 12px;
        color: var(--text-muted, #64748b);
        line-height: 1.7;
        white-space: nowrap;
      }

      .record-empty {
        padding: 28px 0;
        text-align: center;
        color: var(--text-placeholder, #94a3b8);
        font-size: 14px;
      }

      :host {
        --border-color-soft: #eef2f7;
        --primary-500: #4f46e5;
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-muted: #64748b;
        --text-placeholder: #94a3b8;
      }

      :host-context([data-theme='dark']),
      :host-context(.dark-theme) {
        --border-color-soft: #334155;
        --primary-500: #818cf8;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --text-muted: #94a3b8;
        --text-placeholder: #64748b;
      }

      @media (max-width: 768px) {
        .record-list {
          max-height: 52vh;
        }

        .record-item {
          flex-wrap: wrap;
        }

        .record-body {
          flex-basis: calc(100% - 22px);
        }

        .record-time {
          width: 100%;
          margin-left: 22px;
        }
      }
    `,
  ],
  template: `
    <div class="record-card">
      @if (records().length) {
      <div class="record-list">
        @for (item of sortedRecords(); track item.id) {
        <div class="record-item">
          <span nz-icon [nzType]="iconType(item.action)" class="record-icon"></span>
          <div class="record-body">
            <div class="record-content">
              <span class="record-operator">{{ item.actorName || item.actorUserId || '系统' }}</span>
              <span class="record-action">{{ getActionLabel(item.action) }}</span>
              @if (item.comment) {
                <span class="record-comment">：{{ item.comment }}</span>
              }
            </div>
          </div>
          <span class="record-time">{{ formatShortTime(item.createdAt) }}</span>
        </div>
        }
      </div>
      } @else {
      <div class="record-empty">暂无操作记录</div>
      }
    </div>
  `,
})
export class RecordListComponent {
  readonly records = input<ReimbursementLogEntity[]>([]);

  readonly sortedRecords = computed(() =>
    this.records()
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const leftTs = Date.parse(left.item.createdAt);
        const rightTs = Date.parse(right.item.createdAt);
        const safeLeft = Number.isFinite(leftTs) ? leftTs : Number.NEGATIVE_INFINITY;
        const safeRight = Number.isFinite(rightTs) ? rightTs : Number.NEGATIVE_INFINITY;
        if (safeLeft !== safeRight) {
          return safeRight - safeLeft;
        }
        return left.index - right.index;
      })
      .map((entry) => entry.item)
  );

  formatShortTime(createdAt: string): string {
    if (!createdAt) {
      return '--';
    }
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }

  getActionLabel(action: string): string {
    const actionMap: Record<string, string> = {
      create: '创建',
      submit: '提交审批',
      approve: '通过',
      reject: '驳回',
      transfer: '转交',
      add_sign: '加签',
      'attachment.added': '上传附件',
      'attachment.removed': '移除附件',
      cancel: '取消',
      update: '更新',
      recall: '撤回',
    };
    return actionMap[action] || action || '--';
  }

  iconType(action: string): string {
    const iconMap: Record<string, string> = {
      create: 'plus-circle',
      submit: 'upload',
      approve: 'check-circle',
      reject: 'close-circle',
      transfer: 'swap',
      add_sign: 'user-add',
      'attachment.added': 'paper-clip',
      'attachment.removed': 'delete',
      cancel: 'stop',
      update: 'edit',
      recall: 'rollback',
    };
    return iconMap[action] || 'clock-circle';
  }
}
