import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
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
import { TravelExpenseItem, formatDate } from '../../models';
// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 默认空行程
const createEmptyItem = (): TravelExpenseItem => ({
  id: generateId(),
  date: null,
  startEndLocation: [],
  days: null,
  airfare: null,
  transportation: null,
  localTransport: null,
  accommodation: null,
  mealAllowance: null,
  other: null,
  subtotal: 0,
});

// 默认3行数据
const getDefaultItems = (): TravelExpenseItem[] => {
  return [createEmptyItem(), createEmptyItem(), createEmptyItem()];
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
        <button nz-button nzType="default" (click)="addItem()">
          <nz-icon nzType="plus" nzTheme="outline" />
          添加行程
        </button>
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
                  nzFormat="MM-dd"
                  nzPlaceHolder="请选择日期"
                  [ngModel]="item.date"
                  (ngModelChange)="updateDate(item, $event)"
                  style="width: 100%"
                ></nz-date-picker>
              </td>
              <td style="min-width: 100px">
                <app-expense-location-picker
                  [(ngModel)]="item.startEndLocation"
                  [commonPlaces]="commonPlaces"
                  [otherPlaces]="otherPlaces"
                  (ngModelChange)="onLocationChange(item, $event)"
                  triggerWidth="400px"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="number"
                  placeholder="天数"
                  [ngModel]="item.days"
                  (ngModelChange)="updateField(item, 'days', $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="number"
                  placeholder="0.00"
                  [ngModel]="item.airfare"
                  (ngModelChange)="updateField(item, 'airfare', $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="number"
                  placeholder="0.00"
                  [ngModel]="item.transportation"
                  (ngModelChange)="updateField(item, 'transportation', $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="number"
                  placeholder="0.00"
                  [ngModel]="item.localTransport"
                  (ngModelChange)="updateField(item, 'localTransport', $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="number"
                  placeholder="0.00"
                  [ngModel]="item.accommodation"
                  (ngModelChange)="updateField(item, 'accommodation', $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="number"
                  placeholder="0.00"
                  [ngModel]="item.mealAllowance"
                  (ngModelChange)="updateField(item, 'mealAllowance', $event)"
                />
              </td>
              <td>
                <input
                  nz-input
                  type="number"
                  placeholder="0.00"
                  [ngModel]="item.other"
                  (ngModelChange)="updateField(item, 'other', $event)"
                />
              </td>
              <td>
                <span class="subtotal">{{ item.subtotal | number : '1.2-2' }}</span>
              </td>
              <td>
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
              <td>{{ totalDays() }}</td>
              <td>{{ totalAirfare() | number : '1.2-2' }}</td>
              <td>{{ totalTransportation() | number : '1.2-2' }}</td>
              <td>{{ totalLocalTransport() | number : '1.2-2' }}</td>
              <td>{{ totalAccommodation() | number : '1.2-2' }}</td>
              <td>{{ totalMealAllowance() | number : '1.2-2' }}</td>
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

      // 数字输入框样式
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

        // nz-date-picker 暗色主题覆盖
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

        // 按钮暗色主题
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
  readonly items = model<TravelExpenseItem[]>(getDefaultItems());
  readonly itemsChange = output<TravelExpenseItem[]>();
  // 地点选项
  commonPlaces = COMMON_PLACES;
  otherPlaces = OTHER_PLACES;
  // 金额合计
  totalDays = computed(() => this.sumField('days'));
  totalAirfare = computed(() => this.sumField('airfare'));
  totalTransportation = computed(() => this.sumField('transportation'));
  totalLocalTransport = computed(() => this.sumField('localTransport'));
  totalAccommodation = computed(() => this.sumField('accommodation'));
  totalMealAllowance = computed(() => this.sumField('mealAllowance'));
  totalOther = computed(() => this.sumField('other'));
  grandTotal = computed(() => {
    return (
      this.totalAirfare() +
      this.totalTransportation() +
      this.totalLocalTransport() +
      this.totalAccommodation() +
      this.totalMealAllowance() +
      this.totalOther()
    );
  });

  // 辅助函数：计算字段总和
  private sumField(field: keyof TravelExpenseItem): number {
    return this.items().reduce((sum, item) => {
      const value = item[field];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }

  // 获取日期值（字符串转Date对象）
  getDateValue(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // 更新日期
  updateDate(item: TravelExpenseItem, date: Date | null): void {
    const updatedItem = {
      ...item,
      date,
    };
  
    updatedItem.subtotal = this.calculateSubtotal(updatedItem);
  
    const updatedItems = this.items().map((i) =>
      i.id === item.id ? updatedItem : i
    );
  
    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }

  // 通用字段更新
  updateField<K extends keyof TravelExpenseItem>(
    item: TravelExpenseItem,
    field: K,
    value: TravelExpenseItem[K]
  ): void {
    // 处理数字类型
    let processedValue = value;
    if (typeof item[field] === 'number') {
      processedValue = (Number(value) || 0) as TravelExpenseItem[K];
    }

    const updatedItem = { ...item, [field]: processedValue };
    // 重新计算小计
    updatedItem.subtotal = this.calculateSubtotal(updatedItem);

    const updatedItems = this.items().map((i) => (i.id === item.id ? updatedItem : i));

    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }

  // 计算单行小计
  private calculateSubtotal(item: TravelExpenseItem): number {
    return (
      (item.airfare || 0) +
      (item.transportation || 0) +
      (item.localTransport || 0) +
      (item.accommodation || 0) +
      (item.mealAllowance || 0) +
      (item.other || 0)
    );
  }

  // 添加新行程
  addItem(): void {
    const currentCount = this.items().length;
    if (currentCount >= 3) {
      this.message.warning('最多只能添加3条行程');
      return;
    }
    const newItems = [...this.items(), createEmptyItem()];
    this.items.set(newItems);
    this.itemsChange.emit(newItems);
  }

  // 删除行程
  removeItem(id: string): void {
    if (this.items().length <= 1) {
      return; // 至少保留一行
    }
    const newItems = this.items().filter((item) => item.id !== id);
    this.items.set(newItems);
    this.itemsChange.emit(newItems);
  }

  // 重置所有行程
  resetItems(): void {
    this.items.set(getDefaultItems());
    this.itemsChange.emit(getDefaultItems());
  }

  // 设置行程数据（用于编辑模式）
  setItems(items: TravelExpenseItem[]): void {
    // 确保每个item都有正确的subtotal
    const itemsWithSubtotal = items.map((item) => ({
      ...item,
      subtotal: this.calculateSubtotal(item),
    }));
    this.items.set(itemsWithSubtotal.length ? itemsWithSubtotal : getDefaultItems());
    this.itemsChange.emit(itemsWithSubtotal);
  }
  // 位置选择器更新
  onLocationChange(item: TravelExpenseItem, value: string[]): void {
    const updatedItem = { ...item, startEndLocation: value };
    updatedItem.subtotal = this.calculateSubtotal(updatedItem);

    const updatedItems = this.items().map((i) => (i.id === item.id ? updatedItem : i));

    this.items.set(updatedItems);
    this.itemsChange.emit(updatedItems);
  }
}
