import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ExpenseLocationPickerComponent } from '../expense-location-picker/expense-location-picker.component';
import { COMMON_PLACES, OTHER_PLACES } from '../../models/place';
import { ReimbursementItemInput } from '@app/features/reimbursement/models/reimbursement.model';

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Meta 数据类型
interface ExpenseMeta {
  days: number | null;
  airfare: number | null;
  transportation: number | null;
  localTransport: number | null;
  accommodation: number | null;
  mealAllowance: number | null;
  mealExpenses: number | null;
  other: number | null;
}

// 默认空行程
const createEmptyItem = (): ReimbursementItemInput => ({
  id: generateId(),
  itemType: 'travel',
  occurredDate: null,
  fromLocation: '',
  toLocation: '',
  amount: 0,
  meta: {
    days: null,
    airfare: null,
    transportation: null,
    localTransport: null,
    accommodation: null,
    mealAllowance: null,
    mealExpenses: null,
    other: null,
  } ,
  sort: 0,
});

// 默认3行数据
const getDefaultItems = (): ReimbursementItemInput[] => {
  return [createEmptyItem(), createEmptyItem(), createEmptyItem()];
};

// 辅助函数：从 meta 中获取值
const getMetaValue = (item: ReimbursementItemInput, key: keyof ExpenseMeta): number | null => {
  const meta = item.meta as any;
  const value = meta?.[key];
  return value !== null && value !== undefined ? value : null;
};

// 辅助函数：更新 meta 中的值
const updateMetaValue = (
  item: ReimbursementItemInput,
  key: keyof ExpenseMeta,
  value: number | null
): ReimbursementItemInput => {
  const currentMeta = (item.meta as any) || {
    days: null,
    airfare: null,
    transportation: null,
    localTransport: null,
    accommodation: null,
    mealAllowance: null,
    mealExpenses: null,
    other: null,
  };

  return {
    ...item,
    meta: {
      ...currentMeta,
      [key]: value === null ? null : value,
    },
  };
};

// 计算单行小计
const calculateSubtotal = (item: ReimbursementItemInput): number => {
  const meta = item.meta as any;
  return (
    (meta?.airfare || 0) +
    (meta?.transportation || 0) +
    (meta?.localTransport || 0) +
    (meta?.accommodation || 0) +
    (meta?.mealAllowance || 0) +
    (meta?.mealExpenses || 0) +
    (meta?.other || 0)
  );
};

@Component({
  selector: 'app-expense-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzInputModule,
    NzIconModule,
    NzTableModule,
    ExpenseLocationPickerComponent,
  ],
  template: `
  <div class="details-container">
    <div class="details-header">
      <div class="query-card__label">行程与费用明细</div>
    </div>

    <div class="table-wrapper">
      <table class="expense-table">
        <thead>
          <tr>
            <th style="width: 120px">日期</th>
            <th style="width: 180px">起讫地点</th>
            <th style="width: 80px">天数</th>
            <th style="width: 100px">机票</th>
            <th style="width: 100px">车船</th>
            <th style="width: 100px">市内交通</th>
            <th style="width: 100px">住宿</th>
            <th style="width: 100px">餐补</th>
            <th style="width: 100px">餐费</th>
            <th style="width: 100px">其他</th>
            <th style="width: 100px">小计</th>
            <th style="width: 60px">操作</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id; let idx = $index) {
          <tr>
            <td>
              <nz-date-picker
                nzFormat="yyyy-MM-dd"
                nzPlaceHolder="请选择日期"
                [ngModel]="item.occurredDate"
                (ngModelChange)="updateOccurredDate(item, $event)"
                style="width: 100%"
              ></nz-date-picker>
            </td>
            <td style="min-width: 100px">
              <app-expense-location-picker
                [fromLocation]="item.fromLocation!"
                [toLocation]="item.toLocation!"
                [commonPlaces]="commonPlaces"
                [otherPlaces]="otherPlaces"
                (locationChange)="onLocationChange(item, $event)"
                triggerWidth="400px"
              />
            </td>
            <td>
              <input
                nz-input
                type="number"
                placeholder="天数"
                [ngModel]="getMetaValue(item, 'days') === null ? '' : getMetaValue(item, 'days')"
                (ngModelChange)="updateMetaField(item, 'days', $event)"
              />
            </td>
            <td>
              <input
                nz-input
                type="number"
                placeholder="0.00"
                [ngModel]="getMetaValue(item, 'airfare') === null ? '' : getMetaValue(item, 'airfare')"
                (ngModelChange)="updateMetaField(item, 'airfare', $event)"
              />
            </td>
            <td>
              <input
                nz-input
                type="number"
                placeholder="0.00"
                [ngModel]="getMetaValue(item, 'transportation') === null ? '' : getMetaValue(item, 'transportation')"
                (ngModelChange)="updateMetaField(item, 'transportation', $event)"
              />
            </td>
            <td>
              <input
                nz-input
                type="number"
                placeholder="0.00"
                [ngModel]="getMetaValue(item, 'localTransport') === null ? '' : getMetaValue(item, 'localTransport')"
                (ngModelChange)="updateMetaField(item, 'localTransport', $event)"
              />
            </td>
            <td>
              <input
                nz-input
                type="number"
                placeholder="0.00"
                [ngModel]="getMetaValue(item, 'accommodation') === null ? '' : getMetaValue(item, 'accommodation')"
                (ngModelChange)="updateMetaField(item, 'accommodation', $event)"
              />
            </td>
            <td>
              <input
                nz-input
                type="number"
                placeholder="0.00"
                [ngModel]="getMetaValue(item, 'mealAllowance') === null ? '' : getMetaValue(item, 'mealAllowance')"
                (ngModelChange)="updateMetaField(item, 'mealAllowance', $event)"
              />
            </td>
            <td>
            <input
                nz-input
                type="number"
                placeholder="0.00"
                [ngModel]="getMetaValue(item, 'mealExpenses') === null ? '' : getMetaValue(item, 'mealExpenses')"
                (ngModelChange)="updateMetaField(item, 'mealExpenses', $event)"
              />
            </td>
            <td>
              <input
                nz-input
                type="number"
                placeholder="0.00"
                [ngModel]="getMetaValue(item, 'other') === null ? '' : getMetaValue(item, 'other')"
                (ngModelChange)="updateMetaField(item, 'other', $event)"
              />
            </td>
            <td>
              <span class="subtotal">{{ calculateItemSubtotal(item) | number : '1.2-2' }}</span>
            </td>
            <td>
              <button nz-button nzType="link" (click)="resetItem(item.id!)">
                <nz-icon nzType="reload" nzTheme="outline" />
                重置
              </button>
            </td>
          </tr>
          }
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2" class="total-label">合计</td>
            <td>{{ totalDays() }}</td>
            <td>{{ totalAirfare() | number : '1.2-2' }}</td>
            <td>{{ totalTransportation() | number : '1.2-2' }}</td>
            <td>{{ totalLocalTransport() | number : '1.2-2' }}</td>
            <td>{{ totalAccommodation() | number : '1.2-2' }}</td>
            <td>{{ totalMealAllowance() | number : '1.2-2' }}</td>
            <td>{{ totalMealExpenses() | number : '1.2-2' }}</td>
            <td>{{ totalOther() | number : '1.2-2' }}</td>
            <td colspan="2" class="grand-total">总计：{{ grandTotal() | number : '1.2-2' }}</td>
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
        margin-bottom: 10px;
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
          padding: 8px;
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

        .subtotal {
          color: #1890ff;
          font-weight: 500;
        }

        .total-row {
          background-color: #fafafa;
          font-weight: 500;
        }

        .total-label {
          text-align: right;
          font-weight: 600;
        }

        .grand-total {
          color: #f5222d;
          font-weight: 600;
          font-size: 16px;
        }
      }

      nz-date-picker {
        width: 100%;
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
            color: var(--text-secondary-dark, #cbd5e1);
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

          .subtotal {
            color: var(--primary-color-dark, #60a5fa);
          }

          .total-row {
            background-color: var(--bg-secondary-dark, #1e293b);

            td {
              background-color: var(--bg-secondary-dark, #1e293b);
              color: var(--text-primary-dark, #e2e8f0);
            }
          }

          .grand-total {
            color: var(--error-color-dark, #f87171);
          }
        }

        nz-date-picker {
          .ant-picker {
            background-color: var(--bg-container-dark, #1e293b);
            border-color: var(--border-color-dark, #475569);

            input {
              background-color: var(--bg-container-dark, #1e293b);
              color: var(--text-primary-dark, #e2e8f0);
            }
          }
        }

        button[nz-button] {
          &:not([nzType='primary']) {
            background-color: var(--bg-container-dark, #1e293b);
            border-color: var(--border-color-dark, #475569);
            color: var(--text-primary-dark, #e2e8f0);

            &:hover {
              border-color: var(--primary-color-dark, #4f46e5);
              color: var(--primary-color-dark, #60a5fa);
            }
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseDetailsComponent {
  private readonly message = inject(NzMessageService);

  // 支持双向绑定
  readonly items = model<ReimbursementItemInput[]>([]);
  readonly itemsChange = output<ReimbursementItemInput[]>();

  // 地点选项
  commonPlaces = COMMON_PLACES;
  otherPlaces = OTHER_PLACES;

  // 金额合计
  totalDays = computed(() => this.sumMetaField('days'));
  totalAirfare = computed(() => this.sumMetaField('airfare'));
  totalTransportation = computed(() => this.sumMetaField('transportation'));
  totalLocalTransport = computed(() => this.sumMetaField('localTransport'));
  totalAccommodation = computed(() => this.sumMetaField('accommodation'));
  totalMealAllowance = computed(() => this.sumMetaField('mealAllowance'));
  totalMealExpenses = computed(() => this.sumMetaField('mealExpenses'));
  totalOther = computed(() => this.sumMetaField('other'));

  grandTotal = computed(() => {
    return (
      this.totalAirfare() +
      this.totalTransportation() +
      this.totalLocalTransport() +
      this.totalAccommodation() +
      this.totalMealAllowance() +
      this.totalMealExpenses() +
      this.totalOther()
    );
  });

  constructor() {
    effect(() => {
      const currentItems = this.items();
      if (!currentItems?.length) {
        const defaultItems = getDefaultItems();
        this.items.set(defaultItems);
        this.itemsChange.emit(defaultItems);
      }
    });
  }

  // 获取 meta 中的值
  getMetaValue(item: ReimbursementItemInput, key: keyof ExpenseMeta): number | null {
    return getMetaValue(item, key);
  }

  // 计算单行小计
  calculateItemSubtotal(item: ReimbursementItemInput): number {
    return calculateSubtotal(item);
  }

  // 辅助函数：计算 meta 字段总和
  private sumMetaField(field: keyof ExpenseMeta): number {
    return this.items().reduce((sum, item) => {
      const value = getMetaValue(item, field);
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }

  // 更新日期 (occurredDate)
  updateOccurredDate(item: ReimbursementItemInput, date: Date | null): void {
    const dateStr = date ? this.formatDate(date) : null;
    const updatedItem = { ...item, occurredDate: dateStr };

    // 更新 amount
    updatedItem.amount = calculateSubtotal(updatedItem);

    const updatedItems = this.items().map((i) => (i.id === item.id ? updatedItem : i));

    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }

  // 更新 meta 字段
  updateMetaField(
    item: ReimbursementItemInput,
    field: keyof ExpenseMeta,
    value: number | string | null
  ): void {
    let numValue: number | null = null;
    if (value !== null && value !== '') {
      numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) numValue = null;
    }

    let updatedItem = updateMetaValue(item, field, numValue);
    // 更新 amount
    updatedItem.amount = calculateSubtotal(updatedItem);

    const updatedItems = this.items().map((i) => (i.id === item.id ? updatedItem : i));

    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }

  // 重置单行
  resetItem(id: string): void {
    const updatedItems = this.items().map((item) => {
      if (item.id !== id) return item;
      return {
        ...createEmptyItem(),
        id, // 保留当前行 id，避免 DOM 重新创建
      };
    });

    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }

  // 重置所有行程
  resetItems(): void {
    this.items.set(getDefaultItems());
    this.itemsChange.emit(getDefaultItems());
  }

  // 设置行程数据（用于编辑模式）
  setItems(items: ReimbursementItemInput[]): void {
    const normalizedItems = [...items];

    while (normalizedItems.length < 3) {
      normalizedItems.push(createEmptyItem());
    }

    const itemsWithAmount = normalizedItems.map((item) => ({
      ...item,
      amount: calculateSubtotal(item),
    }));

    this.items.set(itemsWithAmount);
    this.itemsChange.emit(itemsWithAmount);
  }

  // 位置选择器更新
  onLocationChange(
    item: ReimbursementItemInput,
    location: { from: string | null; to: string | null }
  ): void {
    const updatedItem = {
      ...item,
      fromLocation: location.from,
      toLocation: location.to,
    };
    updatedItem.amount = calculateSubtotal(updatedItem);

    const updatedItems = this.items().map((i) => (i.id === item.id ? updatedItem : i));

    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
