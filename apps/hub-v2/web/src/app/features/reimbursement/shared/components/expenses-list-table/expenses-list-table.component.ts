import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { DataTableComponent } from '@shared/ui';
import { ReimbursementClaimEntity } from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementTypeTagComponent } from '@app/features/reimbursement/shared/components/reimbursement-type-tag/reimbursement-type-tag.component';
// import type { ReimbursementClaimEntity } from '@app/features/reimbursement/types';

// 扩展实体以包含前端需要的额外字段
export interface ExpenseItem extends ReimbursementClaimEntity {
  // 可以添加前端特有的计算属性
  title?: string;
}

// 选项配置类型
export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-expenses-list-table',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NzTooltipModule,
    NzTagModule,
    DataTableComponent,
    ReimbursementTypeTagComponent,
  ],
  template: `
    <app-data-table>
      <div table-head class="expenses-table__head">
        <div>序号</div>
        <div>单据编号</div>
        <div>报销类型</div>
        <div>报销事由</div>
        <div>金额(元)</div>
        <div>当前节点</div>
        <div>状态</div>
        <div>提交时间</div>
      </div>

      <div table-body class="expenses-table__body">
        @for (item of items(); track item.id; let i = $index) {
        <div
          class="expenses-row"
          [class.is-active]="selectedItemId() === item.id"
          (click)="selectItem.emit(item)"
        >
          <div class="expenses-cell expenses-cell__seq" data-label="序号">{{ sequence(i) }}</div>

          <div class="expenses-cell expenses-cell__code" data-label="单据编号">
            <span class="expenses-code-text" [nz-tooltip]="item.claimNo">
              {{ item.claimNo }}
            </span>
          </div>

          <div class="expenses-cell" data-label="报销类型">
            <app-reimbursement-type-tag [type]="item.claimType" />
          </div>

          <div class="expenses-cell expenses-cell__title" data-label="报销事由">
            <span class="expenses-title-text" [nz-tooltip]="item.reason">
              {{ item.reason }}
            </span>
          </div>

          <div class="expenses-cell expenses-cell__amount" data-label="金额(元)">
            <span class="expenses-amount" [class.high-amount]="item.totalAmount >= 10000">
              ¥{{ item.totalAmount | number : '1.2-2' }}
            </span>
          </div>

          <div class="expenses-cell" data-label="当前节点">
            <span class="expenses-node-text" [nz-tooltip]="item.currentStageName || '-'">
              {{ item.currentStageName || '-' }}
            </span>
          </div>

          <div class="expenses-cell" data-label="状态">
            <nz-tag [nzColor]="getStatusColor(item.status)">
              {{ getStatusLabel(item.status) }}
            </nz-tag>
          </div>

          <div class="expenses-cell expenses-cell__date" data-label="提交时间">
            <span class="expenses-date-text">
              {{ item.submittedAt | date : 'yyyy-MM-dd HH:mm' }}
            </span>
          </div>

        </div>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .expenses-table__head,
      .expenses-row {
        display: grid;
        grid-template-columns:
          56px
          140px
          96px
          minmax(230px, 1fr)
          120px
          150px
          106px
          140px;
        gap: 12px;
        align-items: center;
      }

      .expenses-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .expenses-table__head > div {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .expenses-row {
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color-soft);
        cursor: pointer;
        transition: var(--transition-base);
      }

      .expenses-row:last-child {
        border-bottom: 0;
      }

      .expenses-row:hover {
        background: var(--bg-subtle);
      }

      .expenses-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle) !important;
        box-shadow: inset 3px 0 0 var(--primary-600) !important;
      }

      .expenses-cell {
        min-width: 0;
        color: var(--text-primary);
        font-size: 13px;
      }

      .expenses-cell__seq {
        color: var(--text-muted);
        font-size: 12px;
      }

      .expenses-cell__code {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 13px;
        font-weight: 700;
        color: var(--primary-700);
      }

      .expenses-code-text,
      .expenses-title-text,
      .expenses-node-text,
      .expenses-date-text {
        display: inline-block;
        width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .expenses-title-text {
        font-weight: 500;
        color: var(--text-heading);
      }

      .expenses-cell__title {
        min-width: 0;
      }

      .expenses-cell__amount {
        font-weight: 600;
        font-family: 'SF Mono', 'Fira Code', monospace;
      }

      .expenses-amount {
        color: var(--text-primary);
      }

      .expenses-amount.high-amount {
        color: #f5222d;
        font-weight: 700;
      }

      .expenses-cell__date {
        font-size: 13px;
        color: var(--text-muted);
      }

      @media (max-width: 1440px) {
        .expenses-table__head,
        .expenses-row {
          grid-template-columns:
            48px
            120px
            84px
            minmax(220px, 2fr)
            100px
            100px
            84px
            120px;
          gap: 10px;
        }
        .expenses-row {
          padding-inline: 12px;
        }
      }

      @media (max-width: 1200px) {
        .expenses-table__head,
        .expenses-row {
          grid-template-columns:
            48px
            120px
            minmax(180px, 2fr)
            100px
            100px
            100px;
          gap: 10px;
        }
        .expenses-table__head > :nth-child(3),
        .expenses-row > :nth-child(3) {
          display: none;
        }
      }

      @media (max-width: 960px) {
        .expenses-table__head,
        .expenses-row {
          grid-template-columns:
            40px
            minmax(160px, 2fr)
            90px
            90px
            90px;
          gap: 8px;
        }
        .expenses-table__head > :nth-child(2),
        .expenses-row > :nth-child(2) {
          display: none;
        }
        .expenses-table__head > :nth-child(6),
        .expenses-row > :nth-child(6) {
          display: none;
        }
      }

      @media (max-width: 768px) {
        .expenses-table__head {
          display: none;
        }
        .expenses-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid var(--border-color-soft);
          background: var(--bg-container);
        }
        .expenses-cell {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .expenses-cell::before {
          content: attr(data-label);
          flex: 0 0 84px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
        }
        .expenses-cell > * {
          min-width: 0;
          flex: 1;
          text-align: right;
        }
      }

      :host-context(html[data-theme='dark']) .expenses-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle) !important;
      }

      :host-context(html[data-theme='dark']) .expenses-cell__code {
        color: var(--primary-400);
      }

      :host-context(html[data-theme='dark']) .expenses-amount.high-amount {
        color: #ff4d4f;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesListTableComponent {
  readonly items = input<ReimbursementClaimEntity[]>([]);
  readonly selectedItemId = input<string | null>(null);
  readonly page = input<number>(1);
  readonly pageSize = input<number>(20);
  readonly expenseTypeOptions = input<SelectOption[]>([]);
  readonly statusOptions = input<SelectOption[]>([]);

  readonly selectItem = output<ReimbursementClaimEntity>();

  sequence(index: number): number {
    const page = this.page() || 1;
    const pageSize = this.pageSize() || 20;
    return (page - 1) * pageSize + index + 1;
  }

  getStatusLabel(value: string): string {
    const labelMap: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      approving: '审批中',
      rejected: '已驳回',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labelMap[value] || value;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: 'default',
      submitted: 'processing',
      approving: 'processing',
      rejected: 'error',
      completed: 'success',
      cancelled: 'default',
    };
    return colorMap[status] || 'default';
  }
}
