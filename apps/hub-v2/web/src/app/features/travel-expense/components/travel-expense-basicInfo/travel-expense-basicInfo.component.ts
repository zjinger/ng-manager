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
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';

import { TravelExpenseBasicInfo, normalizeOption, parseDate } from '../../models';

/**
 * 部门选项
 */
const DEPARTMENT_OPTIONS = [
  { label: '技术部', value: 'tech' },
  { label: '产品部', value: 'product' },
  { label: '销售部', value: 'sales' },
  { label: '市场部', value: 'marketing' },
  { label: '人力资源部', value: 'hr' },
];

/**
 * 上/下午选项
 */
const TIME_OPTIONS = [
  { label: '上午', value: 'am' },
  { label: '下午', value: 'pm' },
];

const DEFAULT_BASIC_INFO: TravelExpenseBasicInfo = {
  department: '',
  name: '',
  position: '',
  reportDate: '',
  travelReason: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  travelDays: null,
  receiptCount: null,
};

@Component({
  selector: 'app-travel-expense-basicInfo',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzGridModule,
    NzToolTipModule,
  ],
  template: `
    <form nz-form [nzLayout]="'vertical'">
      <!-- 第一行 -->
      <div class="row" nz-row [nzGutter]="16">
        <div class="col" nz-col [nzSpan]="8">
          <nz-form-item>
            <nz-form-label nzRequired>报销部门</nz-form-label>

            <nz-form-control>
              <nz-select
                nzPlaceHolder="请选择报销部门"
                [ngModel]="value().department"
                name="department"
                (ngModelChange)="updateField('department', $event)"
              >
                @for (item of departmentOptions; track item.value) {
                <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                }
              </nz-select>
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
                [ngModel]="value().name"
                name="name"
                (ngModelChange)="updateField('name', $event)"
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
                [ngModel]="value().position"
                name="position"
                (ngModelChange)="updateField('position', $event)"
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
                [ngModel]="reportDateValue()"
                name="reportDate"
                (ngModelChange)="updateReportDate($event)"
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
                [ngModel]="value().travelReason"
                name="travelReason"
                (ngModelChange)="updateField('travelReason', $event)"
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

            <div class="date-time-group">
              <nz-date-picker
                style="flex: 1"
                nzFormat="yyyy-MM-dd"
                nzPlaceHolder="请选择开始日期"
                [ngModel]="startDateValue()"
                name="startDate"
                (ngModelChange)="updateStartDate($event)"
              />

              <nz-select
                style="width: 100px"
                nzPlaceHolder="上/下午"
                [ngModel]="value().startTime"
                name="startTime"
                (ngModelChange)="updateField('startTime', $event)"
              >
                @for (item of timeOptions; track item.value) {
                <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                }
              </nz-select>
            </div>
          </nz-form-item>
        </div>

        <!-- 结束日期 -->
        <div class="col" nz-col [nzSpan]="8">
          <nz-form-item style="display: block;" [class.has-error]="isDateInvalid()">
            <nz-form-label nzRequired>出差结束日期</nz-form-label>

            <div class="date-time-group">
              <nz-date-picker
                style="flex: 1"
                nzFormat="yyyy-MM-dd"
                nzPlaceHolder="请选择结束日期"
                [ngModel]="endDateValue()"
                name="endDate"
                (ngModelChange)="updateEndDate($event)"
              />

              <nz-select
                style="width: 100px"
                nzPlaceHolder="上/下午"
                [ngModel]="value().endTime"
                name="endTime"
                (ngModelChange)="updateField('endTime', $event)"
              >
                @for (item of timeOptions; track item.value) {
                <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
                }
              </nz-select>
            </div>
          </nz-form-item>
        </div>

        <!-- 出差天数 -->
        <div class="col" nz-col [nzSpan]="8">
          <nz-form-item>
            <nz-form-label nzRequired> 出差天数 </nz-form-label>

            <nz-form-control>
              <input
                nz-input
                type="text"
                inputmode="decimal"
                placeholder="请输入出差天数"
                [ngModel]="value().travelDays"
                name="travelDays"
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
                [ngModel]="value().receiptCount"
                name="receiptCount"
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
      .date-time-group {
        display: flex;
        gap: 8px;
      }

      .has-error {
        .ant-picker,
        .ant-select-selector {
          border-color: #ff4d4f !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelExpenseBasicInfoComponent {
  private readonly message = inject(NzMessageService);

  /**
   * 下拉选项
   */
  readonly departmentOptions = DEPARTMENT_OPTIONS;
  readonly timeOptions = TIME_OPTIONS;

  /**
   * 双向绑定值
   */
  readonly value = model<TravelExpenseBasicInfo>(DEFAULT_BASIC_INFO);

  /**
   * 输出
   */
  readonly valueChange = output<TravelExpenseBasicInfo>();
  readonly validChange = output<boolean>();

  /**
   * DatePicker 专用 Date 类型
   */
  readonly reportDateValue = signal<Date | null>(null);

  readonly startDateValue = signal<Date | null>(null);

  readonly endDateValue = signal<Date | null>(null);

  /**
   * 日期是否合法
   */
  readonly isDateInvalid = computed(() => {
    const start = this.startDateValue();
    const end = this.endDateValue();

    if (!start || !end) {
      return false;
    }

    return start.getTime() > end.getTime();
  });

  /**
   * 自动计算天数
   */
  readonly calculatedTravelDays = computed(() => {
    const startDate = this.startDateValue();
    const endDate = this.endDateValue();

    const startTime = this.value().startTime;
    const endTime = this.value().endTime;

    if (!startDate || !endDate || !startTime || !endTime) {
      return 0;
    }

    if (startDate.getTime() > endDate.getTime()) {
      return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    let total = diffDays;

    if (startTime === 'am' && endTime === 'am') {
      total += 0.5;
    }

    if (startTime === 'am' && endTime === 'pm') {
      total += 1;
    }

    if (startTime === 'pm' && endTime === 'pm') {
      total += 0.5;
    }

    if (diffDays === 0 && startTime === 'pm' && endTime === 'am') {
      total = 0.5;
    }

    return Math.max(0.5, total);
  });

  /**
   * 表单是否有效
   */
  readonly isValid = computed(() => {
    const val = this.value();

    return (
      !!val.department &&
      !!val.name?.trim() &&
      !!val.reportDate &&
      !!val.travelReason?.trim() &&
      !!val.startDate &&
      !!val.startTime &&
      !!val.endDate &&
      !!val.endTime &&
      (val.travelDays ?? 0) > 0 &&
      !this.isDateInvalid()
    );
  });

  constructor() {
    /**
     * 编辑模式：
     * string -> Date
     */
    effect(() => {
      this.reportDateValue.set(parseDate(this.value().reportDate));
    });

    effect(() => {
      this.startDateValue.set(parseDate(this.value().startDate));
    });

    effect(() => {
      this.endDateValue.set(parseDate(this.value().endDate));
    });
    
    effect(() => {
      const department = this.value().department;
      const normalized = normalizeOption(department, this.departmentOptions);
      if (normalized && normalized !== department) {
        this.updateField('department', normalized);
      }
    });
    /**
     * 自动计算天数
     */
    effect(() => {
      const startDate = this.startDateValue();
      const endDate = this.endDateValue();

      const startTime = this.value().startTime;
      const endTime = this.value().endTime;

      if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        return;
      }

      if (startDate && endDate && startTime && endTime) {
        const calculated = this.calculatedTravelDays();

        if (calculated > 0 && calculated !== this.value().travelDays) {
          this.updateField('travelDays', calculated);
        }
      }
    });

    /**
     * 有效性变化
     */
    effect(() => {
      this.validChange.emit(this.isValid());
    });
  }

  /**
   * 更新字段
   */
  updateField<K extends keyof TravelExpenseBasicInfo>(
    key: K,
    value: TravelExpenseBasicInfo[K]
  ): void {
    const updated = {
      ...this.value(),
      [key]: value,
    };

    this.value.set(updated);

    this.valueChange.emit(updated);
  }

  /**
   * 更新填报日期
   */
  updateReportDate(date: Date | null): void {
    this.reportDateValue.set(date);

    this.updateField('reportDate', this.formatDate(date));
  }

  /**
   * 更新开始日期
   */
  updateStartDate(date: Date | null): void {
    this.startDateValue.set(date);

    this.updateField('startDate', this.formatDate(date));
  }

  /**
   * 更新结束日期
   */
  updateEndDate(date: Date | null): void {
    this.endDateValue.set(date);

    this.updateField('endDate', this.formatDate(date));
  }

  /**
   * 更新出差天数
   */
  updateTravelDays(value: number | string | null): void {
    if (value === null || value === '') {
      this.updateField('travelDays', null);
      return;
    }

    const num = typeof value === 'string' ? Number(value) : value;

    if (Number.isNaN(num)) {
      return;
    }

    this.updateField('travelDays', Math.max(0, num));
  }

  /**
   * 更新单据张数
   */
  updateReceiptCount(value: number | string | null): void {
    if (value === null || value === '') {
      this.updateField('receiptCount', null);
      return;
    }

    const num = typeof value === 'string' ? parseInt(value, 10) : value;

    if (Number.isNaN(num)) {
      return;
    }

    this.updateField('receiptCount', Math.max(0, num));
  }

  /**
   * Date -> yyyy-MM-dd
   */
  private formatDate(value: Date | null): string {
    if (!value) {
      return '';
    }

    const year = value.getFullYear();

    const month = String(value.getMonth() + 1).padStart(2, '0');

    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
