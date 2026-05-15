import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  output,
  signal,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ExpenseBasicInfo } from '../../models';
import { normalizeOption, parseDate } from '@app/features/travel-expense/models';

// 部门选项
const DEPARTMENT_OPTIONS = [
  { label: '技术部', value: 'tech' },
  { label: '产品部', value: 'product' },
  { label: '销售部', value: 'sales' },
  { label: '市场部', value: 'marketing' },
  { label: '人力资源部', value: 'hr' },
  { label: '财务部', value: 'finance' },
  { label: '行政部', value: 'admin' },
];

const DEFAULT_BASIC_INFO: ExpenseBasicInfo = {
  department: '',
  expensePerson: '',
  reportDate: '',
  receiptCount: null,
  remark: '',
};

@Component({
  selector: 'app-expense-basic-info',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzGridModule,
  ],
  template: `
    <div>
      <form nz-form [nzLayout]="'vertical'">
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
              <nz-form-label nzRequired>报销人</nz-form-label>
              <nz-form-control nzErrorTip="请输入报销人">
                <input
                  nz-input
                  placeholder="请输入报销人姓名"
                  [ngModel]="value().expensePerson"
                  name="expensePerson"
                  (ngModelChange)="updateField('expensePerson', $event)"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
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
        </div>

        <div class="row" nz-row [nzGutter]="16">
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label>单据数量</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="请输入单据数量"
                  [ngModel]="value().receiptCount"
                  name="receiptCount"
                  (ngModelChange)="updateField('receiptCount', $event)"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="16">
            <nz-form-item>
              <nz-form-label>备注</nz-form-label>
              <nz-form-control>
                <textarea
                  nz-input
                  rows="3"
                  placeholder="请输入备注信息"
                  [ngModel]="value().remark"
                  name="remark"
                  (ngModelChange)="updateField('remark', $event)"
                ></textarea>
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .row {
        margin-bottom: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseBasicInfoComponent {
  readonly departmentOptions = DEPARTMENT_OPTIONS;

  readonly value = model<ExpenseBasicInfo>(DEFAULT_BASIC_INFO);
  readonly valueChange = output<ExpenseBasicInfo>();
  readonly validChange = output<boolean>();

  readonly reportDateValue = signal<Date | null>(null);

  readonly isValid = computed(() => {
    const val = this.value();
    return !!val.department && !!val.expensePerson?.trim() && !!val.reportDate;
  });

  constructor() {
    effect(() => {
      this.validChange.emit(this.isValid());
    });
    effect(() => {
      this.reportDateValue.set(parseDate(this.value().reportDate));
    });
    effect(() => {
      const department = this.value().department;
      const normalized = normalizeOption(department, this.departmentOptions);
      if (normalized && normalized !== department) {
        this.updateField('department', normalized);
      }
    });
  }

  updateField<K extends keyof ExpenseBasicInfo>(key: K, value: ExpenseBasicInfo[K]): void {
    const newValue = { ...this.value(), [key]: value };
    this.value.set(newValue);
    this.valueChange.emit(newValue);
  }

  updateReportDate(date: Date | null): void {
    this.reportDateValue.set(date);
    const formattedDate = this.formatDate(date);
    this.updateField('reportDate', formattedDate);
  }

  private formatDate(value: Date | null): string {
    if (!value || Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  reset(): void {
    this.value.set({ ...DEFAULT_BASIC_INFO });
    this.reportDateValue.set(null);
    this.valueChange.emit(DEFAULT_BASIC_INFO);
    this.validChange.emit(false);
  }
}
