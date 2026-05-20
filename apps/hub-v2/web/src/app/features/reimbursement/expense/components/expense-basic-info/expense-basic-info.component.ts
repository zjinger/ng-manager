import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  output,
  signal,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { CreateReimbursementClaimInput } from '@app/features/reimbursement/models/reimbursement.model';
import { AuthStore } from '@app/core';

const DEFAULT_BASIC_INFO: CreateReimbursementClaimInput = {
  claimType: 'general',
  departmentId: '',
  departmentName: '',
  applicantName: '',
  titleName: '',
  reason: '',
  fillDate: '',
  advanceAmount: 0,
  receiptCount: null,
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
    NzToolTipModule,
  ],
  template: `
    <form nz-form [nzLayout]="'vertical'">
      <div class="row" nz-row [nzGutter]="16">
        <div class="col" nz-col [nzSpan]="8">
          <nz-form-item>
            <nz-form-label nzRequired>报销部门</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                disabled
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
                disabled
                placeholder="请输入姓名"
                name="applicantName"
                [ngModel]="value().applicantName"
              />
            </nz-form-control>
          </nz-form-item>
        </div>

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
      </div>

      <div class="row" nz-row [nzGutter]="16">
        <div class="col" nz-col [nzSpan]="24">
          <nz-form-item>
            <nz-form-label>备注</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="3"
                placeholder="请输入备注信息"
                name="reason"
                [ngModel]="value().reason"
                (ngModelChange)="updateField('reason', $event)"
              ></textarea>
            </nz-form-control>
          </nz-form-item>
        </div>
      </div>

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
      .row {
        margin-bottom: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseBasicInfoComponent {
  private readonly authStore = inject(AuthStore);
  readonly currentUser = this.authStore.currentUser;

  readonly value = model<CreateReimbursementClaimInput>(DEFAULT_BASIC_INFO);
  readonly valueChange = output<CreateReimbursementClaimInput>();
  readonly validChange = output<boolean>();

  // DatePicker 专用 Date 类型
  readonly fillDateValue = signal<Date | null>(null);

  // 表单是否有效
  readonly isValid = computed(() => {
    const val = this.value();
    return (
      !!val.departmentName &&
      !!val.applicantName &&
      !!val.fillDate
    );
  });

  constructor() {
    // 从 AuthStore 获取用户信息
    effect(() => {
      const user = this.currentUser();
      if (user) {
        const initialValue = {
          ...DEFAULT_BASIC_INFO,
          departmentName: user.department?.name || '',
          departmentId: user.department?.id || '',
          applicantName: user.nickname || '',
          titleName: user.titleName || '',
        };
        if (!this.value().departmentName && !this.value().applicantName) {
          this.value.set(initialValue);
          this.valueChange.emit(initialValue);
        }
      }
    });

    // string -> Date 转换
    effect(() => {
      this.fillDateValue.set(this.parseDate(this.value().fillDate || ''));
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
    this.updateField('fillDate', this.formatDate(date) || '');
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
    if (!value) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  reset(): void {
    const user = this.currentUser();
    if (user) {
      const resetValue = {
        ...DEFAULT_BASIC_INFO,
        departmentName: user.department?.name || '',
        departmentId: user.department?.id || '',
        applicantName: user.nickname || '',
        titleName: user.titleName || '',
      };
      this.value.set(resetValue);
    } else {
      this.value.set({ ...DEFAULT_BASIC_INFO });
    }
    this.fillDateValue.set(null);
    this.valueChange.emit(this.value());
    this.validChange.emit(false);
  }
}