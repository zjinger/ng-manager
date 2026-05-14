import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { DataTableComponent } from '@shared/ui';
import { ApprovalListItem } from '../../models';

export interface SelectOption {
  label: string;

  value: string;
}

@Component({
  selector: 'app-approval-list-table',
  standalone: true,
  imports: [
    DecimalPipe,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzTooltipModule,
    DataTableComponent,
  ],

  template: `
    <app-data-table>
      <!-- 表头 -->
      <div table-head class="approval-table__head">
        <div>单据编号</div>
        <div>申请人</div>
        <div>部门</div>
        <div>报销类型</div>
        <div>报销事由</div>
        <div>报销金额</div>
        <div>当前节点</div>
        <div>等待时长</div>
        <div>操作</div>
      </div>

      <!-- 表格内容 -->
      <div table-body class="approval-table__body">
        @for (item of items(); track item.id) {
        <div class="approval-row">
          <!-- 单据编号 -->
          <div class="approval-cell approval-cell__code" data-label="单据编号">
            <span [nz-tooltip]="item.code">
              {{ item.code }}
            </span>
          </div>

          <!-- 申请人 -->
          <div class="approval-cell" data-label="申请人">
            {{ item.applicant }}
          </div>

          <!-- 部门 -->
          <div class="approval-cell" data-label="部门">
            {{ item.department }}
          </div>

          <!-- 类型 -->
          <div class="approval-cell" data-label="类型">
            <nz-tag [nzColor]="getExpenseTypeColor(item.expenseType)">
              {{ getExpenseTypeLabel(item.expenseType) }}
            </nz-tag>
          </div>

          <!-- 事由 -->
          <div class="approval-cell approval-cell__title" data-label="报销事由">
            <span [nz-tooltip]="item.title">
              {{ item.title }}
            </span>
          </div>

          <!-- 金额 -->
          <div class="approval-cell approval-cell__amount" data-label="金额">
            <span class="approval-amount"> ¥{{ item.amount | number : '1.2-2' }} </span>
          </div>

          <!-- 节点 -->
          <div class="approval-cell" data-label="审批节点">
            {{ item.approvalNode }}
          </div>

          <!-- 等待时长 -->
          <div class="approval-cell approval-cell__duration" data-label="等待时长">
            <nz-tag nzColor="orange">
              {{ item.waitDuration }}
            </nz-tag>
          </div>

          <!-- 操作 -->
          <div class="approval-cell approval-cell__actions" data-label="操作">
            <button nz-button nzType="primary" nzSize="small" (click)="approve.emit(item)">
              <nz-icon nzType="audit" />
              审批
            </button>
          </div>
        </div>
        }
      </div>
    </app-data-table>
  `,

  styles: [
    `
      .approval-table__head,
      .approval-row {
        display: grid;

        grid-template-columns:
          150px
          100px
          120px
          100px
          minmax(220px, 1fr)
          120px
          120px
          120px
          100px;

        gap: 12px;

        align-items: center;
      }

      .approval-table__head {
        padding: 12px 16px;

        background: var(--bg-subtle);

        font-size: 13px;

        font-weight: 700;

        color: var(--text-muted);
      }

      .approval-row {
        padding: 14px 16px;

        border-bottom: 1px solid var(--border-color-soft);

        transition: var(--transition-base);
      }

      .approval-row:hover {
        background: var(--bg-subtle);
      }

      .approval-cell {
        min-width: 0;

        overflow: hidden;

        text-overflow: ellipsis;

        white-space: nowrap;

        font-size: 13px;
      }

      .approval-cell__code {
        font-family: 'SF Mono', monospace;

        color: var(--primary-700);

        font-weight: 700;
      }

      .approval-cell__title {
        font-weight: 500;
      }

      .approval-cell__amount {
        font-family: 'SF Mono', monospace;

        font-weight: 700;
      }

      .approval-amount {
        color: #f5222d;
      }

      .approval-cell__actions {
        display: flex;

        justify-content: flex-start;
      }

      /* =========================
       * 响应式
       * ========================= */

      @media (max-width: 1200px) {
        .approval-table__head,
        .approval-row {
          grid-template-columns:
            140px
            90px
            90px
            minmax(180px, 1fr)
            100px
            100px
            100px;

          gap: 10px;
        }

        /* 隐藏部门 */
        .approval-table__head > :nth-child(3),
        .approval-row > :nth-child(3) {
          display: none;
        }

        /* 隐藏类型 */
        .approval-table__head > :nth-child(4),
        .approval-row > :nth-child(4) {
          display: none;
        }
      }

      @media (max-width: 768px) {
        .approval-table__head {
          display: none;
        }

        .approval-row {
          display: flex;

          flex-direction: column;

          gap: 12px;

          padding: 14px;

          border-radius: 12px;

          margin-bottom: 12px;

          border: 1px solid var(--border-color-soft);
        }

        .approval-cell {
          display: flex;

          justify-content: space-between;

          gap: 16px;

          white-space: normal;
        }

        .approval-cell::before {
          content: attr(data-label);

          flex: 0 0 80px;

          color: var(--text-muted);

          font-size: 12px;

          font-weight: 600;
        }

        .approval-cell__actions::before {
          display: none;
        }
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalListTableComponent {
  readonly items = input<ApprovalListItem[]>([]);

  readonly approve = output<ApprovalListItem>();

  getExpenseTypeLabel(type: string): string {
    const map: Record<string, string> = {
      travel: '差旅费报销',
      expense: '费用报销',
    };

    return map[type] || type;
  }

  getExpenseTypeColor(type: string): string {
    const map: Record<string, string> = {
      travel: 'blue',
      expense: 'cyan',
    };

    return map[type] || 'default';
  }
}
