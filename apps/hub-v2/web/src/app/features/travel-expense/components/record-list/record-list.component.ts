import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CommonModule } from '@angular/common';

// 操作记录类型
export interface ProcessOperationRecord {
  id: string;
  // 操作时间
  time?: string;
  // 操作人
  operator?: string;
  // 操作行为
  action?: string;
  // 备注
  remark?: string;
}

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
        /* color: var(--text-secondary, #475569); */
        white-space: nowrap;
      }

      .record-operator {
        /* font-weight: 500; */
        color: var(--text-primary, #0f172a);
      }

      .record-action {
        font-weight: 600;
      }

      .record-action.submit {
        color: var(--action-submit, #2563eb);
      }

      .record-action.approved {
        color: var(--action-approved, #16a34a);
      }

      .record-action.pending {
        color: var(--action-pending, #f97316);
      }

      .record-remark {
        /* color: var(--text-secondary, #475569); */
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
        --action-pending: #f97316;
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
        --action-pending: #fb923c;
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
            {{ item.time || '--' }}
          </div>

          <!-- 操作人 -->
          <div class="record-operator">
            {{ item.operator || '--' }}
          </div>

          <!-- 操作 -->
          <div
            class="record-action"
            [class.submit]="item.action === '提交'"
            [class.approved]="item.action === '通过'"
            [class.pending]="item.action === '待处理'"
          >
            {{ item.action || '--' }}
          </div>

          <!-- 备注 -->
          <div class="record-remark">
            {{ item.remark || '--' }}
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
  readonly records = input<ProcessOperationRecord[]>([]);
}
