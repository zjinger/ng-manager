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
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { AuthStore } from '@app/core';
import { CreateReimbursementClaimInput } from '@app/features/reimbursement/models/reimbursement.model';

// 上/下午选项
const TIME_OPTIONS = [
  { label: '上午', value: 'am' },
  { label: '下午', value: 'pm' },
] as const;

function formatDateValue(value: Date | null): string | null {
  if (!value) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_BASIC_INFO: CreateReimbursementClaimInput = {
  claimType: 'travel',
  departmentId: '',
  departmentName: '',
  applicantName: '',
  titleName: '',
  reason: '',
  fillDate: formatDateValue(new Date()) || '',
  advanceAmount: 0,
  travelStartDate: null,
  travelStartHalf: 'am',
  travelEndDate: null,
  travelEndHalf: 'am',
  travelDays: null,
  receiptCount: null,
  items: [],
};

@Component({
  selector: 'app-travel-expense-basicInfo',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule,
    NzGridModule,
    NzTooltipModule,
  ],
  template: `
  <form nz-form [nzLayout]="'vertical'">
    <!-- 第一行 -->
    <div class="row" nz-row [nzGutter]="16">
      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item>
          <nz-form-label nzRequired>报销部门</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              placeholder="请输入报销部门"
              name="departmentName"
              [ngModel]="value().departmentName"
            />
          </nz-form-control>
        </nz-form-item>
      </div>

      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item>
          <nz-form-label nzRequired>姓名</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              placeholder="请输入姓名"
              name="applicantName"
              [ngModel]="value().applicantName"
            />
          </nz-form-control>
        </nz-form-item>
      </div>

      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item>
          <nz-form-label>职别</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              placeholder="请输入职别"
              name="titleName"
              [ngModel]="value().titleName"
            />
          </nz-form-control>
        </nz-form-item>
      </div>
    </div>

    <!-- 第二行 -->
    <div class="row" nz-row [nzGutter]="16">
      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item>
          <nz-form-label nzRequired>填报日期</nz-form-label>
          <nz-form-control>
            <nz-date-picker
              style="width: 100%"
              nzFormat="yyyy-MM-dd"
              nzPlaceHolder="请选择填报日期"
              name="fillDate"
              [ngModel]="fillDateValue()"
              (ngModelChange)="updateFillDate($event)"
            />
          </nz-form-control>
        </nz-form-item>
      </div>

      <div class="col" nz-col [nzSpan]="16">
        <nz-form-item>
          <nz-form-label nzRequired>出差事由</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              placeholder="例如：深圳客户现场支持"
              name="reason"
              [ngModel]="value().reason"
              (ngModelChange)="updateField('reason', $event)"
            />
          </nz-form-control>
        </nz-form-item>
      </div>
    </div>

    <!-- 第三行 -->
    <div class="row" nz-row [nzGutter]="16">
      <!-- 开始日期 -->
      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item style="display: block;" [class.has-error]="isDateInvalid()">
          <nz-form-label nzRequired>出差开始日期</nz-form-label>
          <div class="date-half-field">
            <nz-date-picker
              class="date-half-field__date"
              nzFormat="yyyy-MM-dd"
              nzPlaceHolder="请选择开始日期"
              name="travelStartDate"
              [ngModel]="travelStartDateValue()"
              (ngModelChange)="updateTravelStartDate($event)"
            />
            <div class="half-segment" aria-label="选择出差开始时间段">
              @for (item of timeOptions; track item.value) {
                <button
                  type="button"
                  class="half-segment__item"
                  [class.is-active]="value().travelStartHalf === item.value"
                  (click)="updateField('travelStartHalf', item.value)"
                >
                  {{ item.label }}
                </button>
              }
            </div>
          </div>
        </nz-form-item>
      </div>

      <!-- 结束日期 -->
      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item style="display: block;" [class.has-error]="isDateInvalid()">
          <nz-form-label nzRequired>出差结束日期</nz-form-label>
          <div class="date-half-field">
            <nz-date-picker
              class="date-half-field__date"
              nzFormat="yyyy-MM-dd"
              nzPlaceHolder="请选择结束日期"
              name="travelEndDate"
              [ngModel]="travelEndDateValue()"
              (ngModelChange)="updateTravelEndDate($event)"
            />
            <div class="half-segment" aria-label="选择出差结束时间段">
              @for (item of timeOptions; track item.value) {
                <button
                  type="button"
                  class="half-segment__item"
                  [class.is-active]="value().travelEndHalf === item.value"
                  (click)="updateField('travelEndHalf', item.value)"
                >
                  {{ item.label }}
                </button>
              }
            </div>
          </div>
        </nz-form-item>
      </div>

      <!-- 出差天数 -->
      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item>
          <nz-form-label nzRequired>出差天数</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              type="text"
              inputmode="decimal"
              placeholder="请输入出差天数"
              name="travelDays"
              [ngModel]="value().travelDays"
              (ngModelChange)="updateTravelDays($event)"
            />
          </nz-form-control>
        </nz-form-item>
      </div>
    </div>

    <!-- 第四行 -->
    <div class="row" nz-row [nzGutter]="16">
      <div class="col" nz-col [nzSpan]="8">
        <nz-form-item>
          <nz-form-label>单据张数</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              type="number"
              min="0"
              step="1"
              placeholder="请输入单据张数"
              name="receiptCount"
              [ngModel]="value().receiptCount"
              (ngModelChange)="updateReceiptCount($event)"
            />
          </nz-form-control>
        </nz-form-item>
      </div>
    </div>
  </form>
`,
  styles: [
    `
      .date-half-field {
        display: flex;
        align-items: stretch;
        width: 100%;
        gap:16px;
      }

      .date-half-field__date {
        flex: 1 1 auto;
        min-width: 0;
      }

      :host ::ng-deep .date-half-field__date .ant-picker {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }

      .half-segment {
        display: inline-flex;
        flex: 0 0 auto;
        padding: 3px;
        border: 1px solid var(--border-color);
        border-radius: 10px;
        background: var(--bg-subtle);
      }

      .half-segment__item {
        min-width: 44px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 24px;
        cursor: pointer;
        transition: all 0.16s ease;
      }

      .half-segment__item:hover {
        color: var(--primary-600);
        background: color-mix(in srgb, var(--primary-500) 8%, transparent);
      }

      .half-segment__item.is-active {
        color: #fff;
        background: var(--primary-600);
        box-shadow: 0 4px 10px color-mix(in srgb, var(--primary-500) 24%, transparent);
      }

      .has-error {
        .ant-picker,
        .half-segment {
          border-color: #ff4d4f !important;
        }
      }

      :host-context(html[data-theme='dark']) .half-segment {
        background: color-mix(in srgb, var(--bg-container) 76%, var(--bg-subtle));
      }

      :host-context(html[data-theme='dark']) .half-segment__item.is-active {
        background: var(--primary-500);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelExpenseBasicInfoComponent {
  private readonly authStore = inject(AuthStore);
  readonly currentUser = this.authStore.currentUser;

  readonly timeOptions = TIME_OPTIONS;

  readonly value = model<CreateReimbursementClaimInput>(DEFAULT_BASIC_INFO);
  readonly valueChange = output<CreateReimbursementClaimInput>();
  readonly validChange = output<boolean>();

  // DatePicker 专用 Date 类型
  readonly fillDateValue = signal<Date | null>(null);
  readonly travelStartDateValue = signal<Date | null>(null);
  readonly travelEndDateValue = signal<Date | null>(null);

  // 日期是否合法
  readonly isDateInvalid = computed(() => {
    const start = this.travelStartDateValue();
    const end = this.travelEndDateValue();
    if (!start || !end) return false;
    return start.getTime() > end.getTime();
  });

  // 自动计算天数
  readonly calculatedTravelDays = computed(() => {
    const startDate = this.travelStartDateValue();
    const endDate = this.travelEndDateValue();
    const startHalf = this.value().travelStartHalf;
    const endHalf = this.value().travelEndHalf;

    if (!startDate || !endDate || !startHalf || !endHalf) return 0;
    if (startDate.getTime() > endDate.getTime()) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    let total = diffDays;

    if (startHalf === 'am' && endHalf === 'am') total += 0.5;
    else if (startHalf === 'am' && endHalf === 'pm') total += 1;
    else if (startHalf === 'pm' && endHalf === 'pm') total += 0.5;
    else if (diffDays === 0 && startHalf === 'pm' && endHalf === 'am') total = 0.5;

    return Math.max(0.5, total);
  });

  // 表单是否有效
  readonly isValid = computed(() => {
    const val = this.value();
    return (
      !!val.departmentName &&
      !!val.applicantName &&
      !!val.fillDate &&
      !!val.reason?.trim() &&
      !!val.travelStartDate &&
      !!val.travelStartHalf &&
      !!val.travelEndDate &&
      !!val.travelEndHalf &&
      (val.travelDays ?? 0) > 0 &&
      !this.isDateInvalid()
    );
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user) {
        const initialValue = {
          ...DEFAULT_BASIC_INFO,
          departmentName: user.department?.name || '',
          departmentId: user.department?.id || '',
          applicantName: user.nickname || '',
          titleName: user.titleName || '',
          fillDate: this.value().fillDate || formatDateValue(new Date()) || '',
        };
        if (!this.value().departmentName && !this.value().applicantName && !this.value().titleName) {
          this.value.set(initialValue);
          this.valueChange.emit(initialValue);
        }
      }
    });
  
    // string -> Date 转换
    effect(() => {
      this.fillDateValue.set(this.parseDate(this.value().fillDate || ''));
    });
    
    effect(() => {
      this.travelStartDateValue.set(this.parseDate(this.value().travelStartDate || ''));
    });
    
    effect(() => {
      this.travelEndDateValue.set(this.parseDate(this.value().travelEndDate || ''));
    });
  
    // 自动计算天数
    effect(() => {
      const startDate = this.travelStartDateValue();
      const endDate = this.travelEndDateValue();
      const startHalf = this.value().travelStartHalf;
      const endHalf = this.value().travelEndHalf;
  
      if (startDate && endDate && startHalf && endHalf && startDate.getTime() <= endDate.getTime()) {
        const calculated = this.calculatedTravelDays();
        if (calculated > 0 && calculated !== this.value().travelDays) {
          this.updateField('travelDays', calculated);
        }
      }
    });
  
    // 有效性变化
    effect(() => {
      this.validChange.emit(this.isValid());
    });
  }

  updateField<K extends keyof CreateReimbursementClaimInput>(
    key: K,
    value: CreateReimbursementClaimInput[K]
  ): void {
    const updated = { ...this.value(), [key]: value };
    this.value.set(updated);
    this.valueChange.emit(updated);
  }

  updateFillDate(date: Date | null): void {
    this.fillDateValue.set(date);
    this.updateField('fillDate', this.formatDate(date ) || '');
  }

  updateTravelStartDate(date: Date | null): void {
    this.travelStartDateValue.set(date);
    const updated: CreateReimbursementClaimInput = {
      ...this.value(),
      travelStartDate: this.formatDate(date),
      travelStartHalf: date && !this.value().travelStartHalf ? 'am' : this.value().travelStartHalf,
    };
    this.value.set(updated);
    this.valueChange.emit(updated);
  }

  updateTravelEndDate(date: Date | null): void {
    this.travelEndDateValue.set(date);
    const updated: CreateReimbursementClaimInput = {
      ...this.value(),
      travelEndDate: this.formatDate(date),
      travelEndHalf: date && !this.value().travelEndHalf ? 'am' : this.value().travelEndHalf,
    };
    this.value.set(updated);
    this.valueChange.emit(updated);
  }

  updateTravelDays(value: number | string | null): void {
    if (value === null || value === '') {
      this.updateField('travelDays', null);
      return;
    }
    const num = typeof value === 'string' ? Number(value) : value;
    if (!isNaN(num)) {
      this.updateField('travelDays', Math.max(0, num));
    }
  }

  updateReceiptCount(value: number | string | null): void {
    if (value === null || value === '') {
      this.updateField('receiptCount', null);
      return;
    }
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (!isNaN(num)) {
      this.updateField('receiptCount', Math.max(0, num));
    }
  }

  private parseDate(value: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private formatDate(value: Date | null): string | null {
    return formatDateValue(value);
  }
}
