import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ReimbursementItemInput } from '@app/features/reimbursement/models/reimbursement.model';

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 默认空明细
const createEmptyItem = (): ReimbursementItemInput => ({
  id: generateId(),
  itemType: 'general', // 或其他合适的类型
  amount: 0,
  sort: 0,
  description: '', // 用于存储费用用途
});

// 固定4行数据
const getDefaultItems = (): ReimbursementItemInput[] => {
  return [createEmptyItem(), createEmptyItem(), createEmptyItem(), createEmptyItem()];
};

@Component({
  selector: 'app-expense-detail-item',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule],
  template: `
    <div class="details-container">
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
            @for (item of displayItems(); track item.id; let idx = $index) {
            <tr>
              <td class="seq-cell">{{ idx + 1 }}</td>
              <td>
                <input
                  nz-input
                  placeholder="请输入费用用途，如：办公用品采购"
                  [ngModel]="item.description"
                  (ngModelChange)="updateDescription(item, $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="text"
                  placeholder="请输入金额"
                  inputmode="decimal"
                  [ngModel]="amountInputValue(item.amount)"
                  (ngModelChange)="updateAmount(item, $event)"
                />
              </td>
              <td class="action-cell">
                <button
                  nz-button
                  nzType="link"
                  nzDanger
                  (click)="clearItem(item.id!)"
                >
                  <nz-icon nzType="delete" nzTheme="outline" />
                  清空
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

  readonly items = model<ReimbursementItemInput[]>([]);
  readonly itemsChange = output<ReimbursementItemInput[]>();

  // 显示的明细列表（固定4行）
  readonly displayItems = computed(() => {
    const currentItems = this.items();
    const targetRowCount = 4;
    const displayList = [...currentItems];

    // 如果实际数据不足4行，用空行填充
    for (let i = displayList.length; i < targetRowCount; i++) {
      displayList.push(createEmptyItem());
    }

    return displayList;
  });

  // 计算总金额
  totalAmount = computed(() => {
    return this.items().reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  updateDescription(item: ReimbursementItemInput, value: string): void {
    const updatedItem = { ...item, description: value };
    this.updateItem(updatedItem);
  }

  updateAmount(item: ReimbursementItemInput, value: string | number | null): void {
    let numValue: number = 0;
    if (value !== null && value !== '') {
      const parsed = typeof value === 'string' ? parseFloat(value) : value;
      numValue = isNaN(parsed) ? 0 : parsed;
    }

    const updatedItem = { ...item, amount: numValue };
    this.updateItem(updatedItem);
  }

  amountInputValue(value: number | null | undefined): string | number | null {
    return value ? value : null;
  }

  // 清空单行数据
  clearItem(id: string): void {
    const currentItems = this.items();
    const existingIndex = currentItems.findIndex((i) => i.id === id);
    
    if (existingIndex >= 0) {
      // 清空该行数据
      const clearedItem = {
        ...createEmptyItem(),
        id: currentItems[existingIndex].id, // 保留原ID
      };
      const newItems = currentItems.map((i) => (i.id === id ? clearedItem : i));
      this.items.set(newItems);
      this.itemsChange.emit(newItems);
      this.message.success('已清空该行数据');
    }
  }

  // 通用更新方法
  private updateItem(updatedItem: ReimbursementItemInput): void {
    const currentItems = this.items();
    const existingIndex = currentItems.findIndex((i) => i.id === updatedItem.id);

    let newItems: ReimbursementItemInput[];

    if (existingIndex >= 0) {
      // 更新已存在的行
      newItems = currentItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    } else {
      // 新增的行，添加到数组中
      newItems = [...currentItems, updatedItem];
    }

    const validItems = this.filterEmptyItems(newItems);

    this.items.set(validItems);
    this.itemsChange.emit(validItems);
  }

  // 过滤空数据行（description为空且amount为0）
  private filterEmptyItems(items: ReimbursementItemInput[]): ReimbursementItemInput[] {
    return items.filter((item) => {
      const hasContent = 
        (item.description && item.description.trim() !== '') ||
        (item.amount && item.amount !== 0);
      return hasContent;
    });
  }

  // 重置所有明细
  resetItems(): void {
    this.items.set([]);
    this.itemsChange.emit([]);
    this.message.success('已重置所有费用明细');
  }

  // 获取实际有效的明细数据（用于提交）
  getValidItems(): ReimbursementItemInput[] {
    return this.filterEmptyItems(this.items());
  }
}
