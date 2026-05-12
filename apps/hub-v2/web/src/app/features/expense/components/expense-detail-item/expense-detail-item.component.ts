import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  output,
  signal,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ExpenseDetailItem } from '../../models';

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 默认空明细
const createEmptyItem = (): ExpenseDetailItem => ({
  id: generateId(),
  purpose: '',
  amount: null,
});

// 默认3行数据
const getDefaultItems = (): ExpenseDetailItem[] => {
  return [createEmptyItem(), createEmptyItem(), createEmptyItem()];
};

@Component({
  selector: 'app-expense-detail-item',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule],
  template: `
    <div class="details-container">
      <div class="details-header">
        <div class="query-card__label">费用明细</div>
        <button nz-button nzType="default" (click)="addItem()" [disabled]="items().length >= 4">
          <nz-icon nzType="plus" nzTheme="outline" />
          添加费用
        </button>
      </div>

      <div class="table-wrapper">
        <table class="expense-table">
          <thead>
            <tr>
              <th style="width: 60px">序号</th>
              <th>用途</th>
              <th style="width: 200px">金额（元）</th>
              <th style="width: 80px">操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id; let idx = $index) {
            <tr>
              <td class="seq-cell">{{ idx + 1 }}</td>
              <td>
                <input
                  nz-input
                  placeholder="请输入费用用途，如：办公用品采购"
                  [ngModel]="item.purpose"
                  (ngModelChange)="updateField(item, 'purpose', $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="text"
                  placeholder="0.00"
                  inputmode="decimal"
                  [ngModel]="item.amount"
                  (ngModelChange)="updateField(item, 'amount', $event)"
                />
              </td>
              <td class="action-cell">
                <button
                  nz-button
                  nzType="link"
                  nzDanger
                  (click)="removeItem(item.id)"
                  [disabled]="items().length <= 1"
                >
                  <nz-icon nzType="delete" nzTheme="outline" />
                </button>
              </td>
            </tr>
            }
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2" class="total-label">合计</td>
              <td class="total-amount">{{ totalAmount() | number : '1.2-2' }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .details-container {
        width: 100%;
      }

      .details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .query-card__label {
        font-size: 15px;
        font-weight: 600;
        margin: 0;
        color: var(--text-heading);
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .expense-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;

        th,
        td {
          border: 1px solid #f0f0f0;
          padding: 12px 8px;
          text-align: left;
          vertical-align: middle;
        }

        th {
          background-color: #fafafa;
          font-weight: 600;
          white-space: nowrap;
        }

        td {
          background-color: #fff;
        }

        input {
          width: 100%;
          box-sizing: border-box;
        }

        .seq-cell {
          text-align: center;
          color: #8c8c8c;
        }

        .action-cell {
          text-align: center;
        }

        .total-row {
          background-color: #fafafa;
          font-weight: 500;
        }

        .total-label {
          text-align: right;
          font-weight: 600;
        }

        .total-amount {
          color: #f5222d;
          font-weight: 600;
          font-size: 16px;
        }
      }

      button[nz-button] {
        padding: 0 8px;
      }

      input[type='number'] {
        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
          opacity: 0.5;
        }

        &:hover::-webkit-inner-spin-button,
        &:hover::-webkit-outer-spin-button {
          opacity: 1;
        }
      }
      /* ========== 暗色主题适配 ========== */
      :host-context(html[data-theme='dark']) {
        .query-card__label {
          color: var(--text-heading-dark, #e2e8f0);
        }

        .expense-table {
          th,
          td {
            border-color: var(--border-color-dark, #334155);
          }

          th {
            background-color: var(--bg-secondary-dark, #1e293b);
            color: var(--text-primary-dark, #e2e8f0);
          }

          td {
            background-color: var(--bg-container-dark, #0f172a);
            color: var(--text-primary-dark, #e2e8f0);
          }

          input {
            background-color: var(--bg-container-dark, #1e293b);
            border-color: var(--border-color-dark, #475569);
            color: var(--text-primary-dark, #e2e8f0);

            &::placeholder {
              color: var(--text-placeholder-dark, #64748b);
            }

            &:focus {
              border-color: var(--primary-color-dark, #4f46e5);
              box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
            }
          }

          .seq-cell {
            color: var(--text-secondary-dark, #94a3b8);
          }

          .total-row {
            background-color: var(--bg-secondary-dark, #1e293b);

            td {
              background-color: var(--bg-secondary-dark, #1e293b);
              color: var(--text-primary-dark, #e2e8f0);
            }
          }

          .total-amount {
            color: var(--error-color-dark, #f87171);
          }
        }

        button[nz-button] {
          &:not([nzType='primary']) {
            background-color: var(--bg-container-dark, #1e293b);
            border-color: var(--border-color-dark, #475569);
            color: var(--text-primary-dark, #e2e8f0);

            &:hover:not(:disabled) {
              border-color: var(--primary-color-dark, #4f46e5);
              color: var(--primary-color-dark, #60a5fa);
            }
          }

          &[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseDetailItemComponent {
  private readonly message = inject(NzMessageService);

  readonly items = model<ExpenseDetailItem[]>(getDefaultItems());
  readonly itemsChange = output<ExpenseDetailItem[]>();

  // 计算总金额
  totalAmount = computed(() => {
    return this.items().reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  updateField<K extends keyof ExpenseDetailItem>(
    item: ExpenseDetailItem,
    field: K,
    value: ExpenseDetailItem[K]
  ): void {
    let processedValue: ExpenseDetailItem[K] | null = value;
    if (field === 'amount') {
      const numValue = Number(value);
      processedValue = isNaN(numValue) || value === '' ? null : (numValue as ExpenseDetailItem[K]);
    }

    const updatedItem = { ...item, [field]: processedValue };
    const updatedItems = this.items().map((i) => (i.id === item.id ? updatedItem : i));

    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }

  addItem(): void {
    if (this.items().length >= 4) {
      this.message.warning('最多只能添加4条费用明细');
      return;
    }
    const newItems = [...this.items(), createEmptyItem()];
    this.items.set(newItems);
    this.itemsChange.emit(newItems);
  }

  removeItem(id: string): void {
    if (this.items().length <= 1) {
      this.message.warning('至少保留一条费用明细');
      return;
    }
    const newItems = this.items().filter((item) => item.id !== id);
    this.items.set(newItems);
    this.itemsChange.emit(newItems);
  }

  resetItems(): void {
    this.items.set(getDefaultItems());
    this.itemsChange.emit(getDefaultItems());
  }
}
