import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ReimbursementLogEntity } from '@app/features/reimbursement/models/reimbursement.model';

@Component({
  selector: 'app-record-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .record-list {
        display: flex;
        flex-direction: column;
      }

      .record-item {
        display: grid;
        grid-template-columns: 180px 160px 120px 1fr;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color, #f1f5f9);
        font-size: 14px;
      }

      .record-item:last-child {
        border-bottom: none;
      }

      .record-time {
        white-space: nowrap;
      }

      .record-operator {
        color: var(--text-primary, #0f172a);
      }

      .record-action {
      }

      .record-action.submit {
        color: var(--action-submit, #2563eb);
      }

      .record-action.approve {
        color: var(--action-approved, #16a34a);
      }

      .record-action.reject {
        color: var(--action-reject, #dc2626);
      }

      .record-action.create {
        color: var(--action-create, #6b7280);
      }

      .record-action.transfer {
        color: var(--action-transfer, #f97316);
      }

      .record-action.add_sign {
        color: var(--action-addsign, #8b5cf6);
      }

      .record-action.cancel {
        color: var(--action-cancel, #ef4444);
      }

      .record-action.update {
        color: var(--action-update, #059669);
      }

      .record-remark {
        word-break: break-word;
      }

      .record-empty {
        padding: 48px 24px;
        text-align: center;
        color: var(--text-placeholder, #94a3b8);
        font-size: 14px;
      }

      /* 暗黑主题变量定义 */
      :host {
        --border-color: #f1f5f9;
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-placeholder: #94a3b8;
        --action-submit: #2563eb;
        --action-approved: #16a34a;
        --action-reject: #dc2626;
        --action-create: #6b7280;
        --action-transfer: #f97316;
        --action-addsign: #8b5cf6;
        --action-cancel: #ef4444;
        --action-update: #059669;
      }

      /* 暗黑主题 */
      :host-context([data-theme='dark']),
      :host-context(.dark-theme) {
        --border-color: #334155;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --text-placeholder: #64748b;
        --action-submit: #60a5fa;
        --action-approved: #4ade80;
        --action-reject: #f87171;
        --action-create: #9ca3af;
        --action-transfer: #fb923c;
        --action-addsign: #a78bfa;
        --action-cancel: #f87171;
        --action-update: #34d399;
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .record-item {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    `,
  ],
  template: `
    <div class="record-card">
      @if (records().length) {
      <div class="record-list">
        @for (item of records(); track item.id) {
        <div class="record-item">
          <!-- 时间 -->
          <div class="record-time">
            {{ formatTime(item.createdAt) }}
          </div>

          <!-- 操作人 -->
          <div class="record-operator">
            {{ item.actorName || item.actorUserId || '--' }}
          </div>

          <!-- 操作 -->
          <!-- <div
            class="record-action"
            [class.submit]="item.action === 'submit'"
            [class.approve]="item.action === 'approve'"
            [class.reject]="item.action === 'reject'"
            [class.create]="item.action === 'create'"
            [class.transfer]="item.action === 'transfer'"
            [class.add_sign]="item.action === 'add_sign'"
            [class.cancel]="item.action === 'cancel'"
            [class.update]="item.action === 'update'"
          >
            {{ getActionLabel(item.action) }}
          </div> -->
          <div class="record-action">
            {{ getActionLabel(item.action) }}
          </div>
          <!-- 备注 -->
          <div class="record-remark">
            {{ item.comment || '--' }}
          </div>
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

  /**
   * 格式化时间
   */
  formatTime(createdAt: string): string {
    if (!createdAt) return '--';

    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 获取操作标签
   */
  getActionLabel(action: string): string {
    const actionMap: Record<string, string> = {
      create: '创建',
      submit: '提交审批',
      approve: '通过',
      reject: '驳回',
      transfer: '转交',
      add_sign: '加签',
      cancel: '取消',
      update: '更新',
      recall: '撤回',
    };
    return actionMap[action] || action || '--';
  }
}
