import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  effect,
} from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';

// 基础信息类型
export type TravelExpenseBasicInfo = {
  department: string; // 报销部门
  name: string; // 姓名
  position: string; // 职别
  reportDate: string; // 填报日期
  travelReason: string; // 出差事由
  startDate: string; // 出差开始日期
  startTime: 'am' | 'pm' | ''; // 开始时间（上/下午）
  endDate: string; // 出差结束日期
  endTime: 'am' | 'pm' | ''; // 结束时间（上/下午）
  travelDays: number | null; // 出差天数（支持手动输入）
  receiptCount: number | null; // 单据张数
};

// 部门选项
const DEPARTMENT_OPTIONS = [
  { label: '技术部', value: 'tech' },
  { label: '产品部', value: 'product' },
  { label: '销售部', value: 'sales' },
  { label: '市场部', value: 'marketing' },
  { label: '人力资源部', value: 'hr' },
];

// 上/下午选项
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
    <div>
      <form nz-form [nzLayout]="'vertical'">
        <!-- 第一行：部门、姓名、职别 -->
        <div class="row" nz-row [nzGutter]="16">
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label nzRequired>报销部门</nz-form-label>
              <nz-form-control nzErrorTip="请选择报销部门">
                <nz-select
                  nzPlaceHolder="请选择报销部门"
                  [ngModel]="value().department"
                  name="department"
                  (ngModelChange)="updateField('department', $event)"
                >
                  @for (item of departmentOptions; track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label nzRequired>姓名</nz-form-label>
              <nz-form-control nzErrorTip="请输入姓名">
                <input
                  nz-input
                  required
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
              <nz-form-control nzErrorTip="请输入职别">
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

        <!-- 第二行：填报日期、出差事由 -->
        <div class="row" nz-row [nzGutter]="16">
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label nzRequired>填报日期</nz-form-label>
              <nz-form-control nzErrorTip="请选择填报日期">
                <nz-date-picker
                  style="width: 100%"
                  nzFormat="yyyy-MM-dd"
                  nzPlaceHolder="请选择填报日期"
                  [ngModel]="reportDateValue()"
                  name="reportDate"
                  (ngModelChange)="updateReportDate($event)"
                ></nz-date-picker>
              </nz-form-control>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="16">
            <nz-form-item>
              <nz-form-label nzRequired>出差事由</nz-form-label>
              <nz-form-control nzErrorTip="请输入出差事由">
                <input
                  nz-input
                  required
                  placeholder="例如：深圳客户现场支持"
                  [ngModel]="value().travelReason"
                  name="travelReason"
                  (ngModelChange)="updateField('travelReason', $event)"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <!-- 第三行：出差起止日期 -->
        <div class="row" nz-row [nzGutter]="16">
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
                ></nz-date-picker>
                <nz-select
                  style="width: 100px"
                  nzPlaceHolder="上/下午"
                  [ngModel]="value().startTime"
                  name="startTime"
                  (ngModelChange)="updateStartTime($event)"
                >
                  @for (item of timeOptions; track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                  }
                </nz-select>
              </div>
            </nz-form-item>
          </div>
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
                ></nz-date-picker>
                <nz-select
                  style="width: 100px"
                  nzPlaceHolder="上/下午"
                  [ngModel]="value().endTime"
                  name="endTime"
                  (ngModelChange)="updateEndTime($event)"
                >
                  @for (item of timeOptions; track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                  }
                </nz-select>
              </div>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label nzRequired> 出差天数 </nz-form-label>
              <nz-form-control nzErrorTip="请输入出差天数">
                <div class="days-input-wrapper">
                  <input
                    nz-input
                    type="text"
                    inputmode="decimal"
                    step="0.5"
                    placeholder="请输入出差天数"
                    [ngModel]="value().travelDays"
                    name="travelDays"
                    (ngModelChange)="updateTravelDays($event)"
                  />
                </div>
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <!-- 第四行：单据张数 -->
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
    </div>
  `,
  styles: [
    `
      .date-time-group {
        display: flex;
        gap: 8px;
      }

      .days-input-wrapper {
        position: relative;
      }

      .auto-calc-hint {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 12px;
        color: #1890ff;
        background: #e6f7ff;
        padding: 2px 8px;
        border-radius: 4px;
        pointer-events: none;
        white-space: nowrap;
      }

      :host ::ng-deep .ant-input-affix-wrapper {
        padding-right: 80px;
      }

      .has-error .ant-form-item-control {
        border-color: #ff4d4f;
      }

      .error-tip {
        color: #ff4d4f;
        font-size: 12px;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .error-tip span[nz-icon] {
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelExpenseBasicInfoComponent {
  private readonly message = inject(NzMessageService);

  // 部门选项对外暴露
  readonly departmentOptions = DEPARTMENT_OPTIONS;
  // 上/下午选项
  readonly timeOptions = TIME_OPTIONS;

  // 使用 model 实现双向绑定
  readonly value = model<TravelExpenseBasicInfo>(DEFAULT_BASIC_INFO);

  // output 监听变化
  readonly valueChange = output<TravelExpenseBasicInfo>();
  readonly validChange = output<boolean>();

  // 日期选择器的值（Date 对象）
  readonly reportDateValue = signal<Date | null>(null);
  readonly startDateValue = signal<Date | null>(null);
  readonly endDateValue = signal<Date | null>(null);

  // 日期是否无效（开始日期晚于结束日期）
  readonly isDateInvalid = computed(() => {
    const startDate = this.startDateValue();
    const endDate = this.endDateValue();
    if (!startDate || !endDate) return false;
    return startDate.getTime() > endDate.getTime();
  });

  // 精确计算出差天数（精确到0.5天）
  // 规则参考原系统：基于整天数 + 首尾半天调整
  readonly calculatedTravelDays = computed(() => {
    const startDate = this.startDateValue();
    const endDate = this.endDateValue();
    const startTime = this.value().startTime;
    const endTime = this.value().endTime;

    // 如果日期无效，返回0
    if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
      return 0;
    }

    if (!startTime || !endTime) {
      return 0;
    }

    // 复制日期对象，设置到当天开始
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // 计算整天数差（不包含首尾）
    const dayDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    let totalDays = dayDiff;

    // 根据上下午调整
    if (startTime === 'am' && endTime === 'am') {
      totalDays += 0.5;
    } else if (startTime === 'am' && endTime === 'pm') {
      totalDays += 1;
    } else if (startTime === 'pm' && endTime === 'am') {
      totalDays += 0;
    } else if (startTime === 'pm' && endTime === 'pm') {
      totalDays += 0.5;
    }

    // 如果是同一天，需要特殊处理
    if (dayDiff === 0 && startDate.getTime() === endDate.getTime()) {
      if (startTime === 'am' && endTime === 'am') {
        totalDays = 0.5;
      } else if (startTime === 'am' && endTime === 'pm') {
        totalDays = 1;
      } else if (startTime === 'pm' && endTime === 'am') {
        totalDays = 0.5;
      } else if (startTime === 'pm' && endTime === 'pm') {
        totalDays = 0.5;
      }
    }

    // 确保最小值为0.5
    if (totalDays <= 0 && startDate.getTime() <= endDate.getTime()) {
      totalDays = 0.5;
    }

    return Math.round(totalDays * 2) / 2;
  });

  // 计算表单是否完整有效
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
    // 监听所有影响天数的因素变化，自动更新天数
    effect(() => {
      // 触发计算的条件：开始日期、结束日期、开始时间、结束时间任一变化
      const startDate = this.startDateValue();
      const endDate = this.endDateValue();
      const startTime = this.value().startTime;
      const endTime = this.value().endTime;

      // 检查日期是否有效
      if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        // 日期无效时，提示并重置天数
        this.message.warning('结束日期不能早于开始日期', { nzDuration: 3000 });
        if ((this.value().travelDays ?? 0) !== 0) {
          this.updateField('travelDays', 0);
        }
        return;
      }

      // 只要有完整的起止信息，就重新计算天数
      if (startDate && endDate && startTime && endTime && !this.isDateInvalid()) {
        const calculated = this.calculatedTravelDays();
        const currentDays = this.value().travelDays;

        // 自动更新天数（保持与计算值同步）
        if (calculated !== currentDays && calculated > 0) {
          this.updateField('travelDays', calculated);
        }
      }
    });

    // 监听有效性变化并通知父组件
    effect(() => {
      this.validChange.emit(this.isValid());
    });
  }

  // 更新字段
  updateField<K extends keyof TravelExpenseBasicInfo>(
    key: K,
    value: TravelExpenseBasicInfo[K]
  ): void {
    const newValue = { ...this.value(), [key]: value };
    this.value.set(newValue);
    this.valueChange.emit(newValue);
  }

  // 更新出差天数（手动输入）
  updateTravelDays(value: number | string | null): void {
    // 输入为空
    if (value === null || value === '') {
      this.updateField('travelDays', null);
      return;
    }

    let numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      this.updateField('travelDays', null);
      return;
    }

    if (numValue < 0) {
      numValue = 0;
    }

    if (this.isDateInvalid() && numValue > 0) {
      this.message.warning('请先修正日期后再填写天数', {
        nzDuration: 3000,
      });
      return;
    }

    this.updateField('travelDays', numValue);
  }

  // 更新填报日期
  updateReportDate(date: Date | null): void {
    this.reportDateValue.set(date);
    const formattedDate = this.formatDate(date);
    this.updateField('reportDate', formattedDate);
  }

  // 更新开始日期
  updateStartDate(date: Date | null): void {
    this.startDateValue.set(date);
    const formattedDate = this.formatDate(date);
    this.updateField('startDate', formattedDate);
  }

  // 更新结束日期
  updateEndDate(date: Date | null): void {
    this.endDateValue.set(date);
    const formattedDate = this.formatDate(date);
    this.updateField('endDate', formattedDate);
  }

  // 更新开始时间
  updateStartTime(value: 'am' | 'pm' | ''): void {
    this.updateField('startTime', value);
  }

  // 更新结束时间
  updateEndTime(value: 'am' | 'pm' | ''): void {
    this.updateField('endTime', value);
  }

  // 格式化日期
  private formatDate(value: Date | null): string {
    if (!value || Number.isNaN(value.getTime())) {
      return '';
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 重置表单
  reset(): void {
    const emptyValue: TravelExpenseBasicInfo = {
      department: '',
      name: '',
      position: '',
      reportDate: '',
      travelReason: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      travelDays: 0,
      receiptCount: 0,
    };
    this.value.set(emptyValue);
    this.reportDateValue.set(null);
    this.startDateValue.set(null);
    this.endDateValue.set(null);
    this.valueChange.emit(emptyValue);
    this.validChange.emit(false);
  }
  updateReceiptCount(value: number | string | null): void {
    if (value === null || value === '') {
      this.updateField('receiptCount', null);
      return;
    }

    let numValue = typeof value === 'string' ? parseInt(value, 10) : value;

    if (isNaN(numValue)) {
      this.updateField('receiptCount', null);
      return;
    }

    if (numValue < 0) {
      numValue = 0;
    }

    this.updateField('receiptCount', numValue);
  }
  // 获取表单数据
  getValue(): TravelExpenseBasicInfo {
    return this.value();
  }

  // 获取部门标签（用于预览）
  getDepartmentLabel(value: string): string {
    const option = this.departmentOptions.find((opt) => opt.value === value);
    return option?.label || '';
  }

  // 获取时间标签
  getTimeLabel(value: 'am' | 'pm' | ''): string {
    const option = this.timeOptions.find((opt) => opt.value === value);
    return option?.label || '';
  }

  // 获取出差天数（供外部使用）
  getTravelDays(): number {
    return this.value().travelDays ?? 0;
  }
}
