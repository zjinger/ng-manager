import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent, FormActionsComponent } from '@app/shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';

export interface CountersignData {
  countersignTo: string | null;
  countersignMethod: string | null;
  description: string;
}

@Component({
  selector: 'countersign-affirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogShellComponent,
    FormActionsComponent,
    NzButtonModule,
    NzFormModule,
    NzSelectModule,
    NzInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-shell
      [open]="open()"
      [center]="true"
      [width]="620"
      title="加签确认"
      [subtitle]="''"
      [modalClass]="'countersign-affirm-modal'"
      (cancel)="onCancel()"
    >
      <div dialog-body>
        <!-- 提示信息 -->
        <div class="dialog-body-tips-wrapper">
          <span class="dialog-body-text"
            >邀请其他人员补充审批意见，完成后回到当前节点继续审批。</span
          >
          <div class="dialog-body-tips">
            适用于费用归属不清、金额较大、需要项目负责人或行政负责人确认等场景。
          </div>
        </div>

        <!-- 表单 -->
        <form nz-form [nzLayout]="'vertical'" class="countersign-form">
          <!-- 第一行：加签人、加签方式 -->
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>加签人</nz-form-label>
                <nz-form-control [nzErrorTip]="'请选择加签人'">
                  <nz-select
                    nzPlaceHolder="请选择加签人"
                    [(ngModel)]="formData.countersignTo"
                    name="countersignTo"
                    [nzAllowClear]="true"
                  >
                    @for (item of countersignToOptions; track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>加签方式</nz-form-label>
                <nz-form-control [nzErrorTip]="'请选择加签方式'">
                  <nz-select
                    nzPlaceHolder="请选择加签方式"
                    [(ngModel)]="formData.countersignMethod"
                    name="countersignMethod"
                    [nzAllowClear]="true"
                  >
                    @for (item of countersignMethodOptions; track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- 第二行：加签说明 -->
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label nzRequired>加签说明</nz-form-label>
                <nz-form-control nzErrorTip="请输入加签说明">
                  <textarea
                    nz-input
                    rows="4"
                    placeholder="例如：请确认该客户拜访费用是否计入项目成本。"
                    [(ngModel)]="formData.description"
                    name="description"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="onCancel()">取消</button>
          <button
            nz-button
            type="button"
            nzType="primary"
            [nzLoading]="submitting()"
            [disabled]="!isFormValid"
            (click)="onSubmit()"
          >
            确定加签
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .dialog-body-tips-wrapper {
        margin-bottom: 24px;
      }
      .dialog-body-text {
        color: rgb(100 116 139);
        display: block;
        margin-bottom: 12px;
      }
      .dialog-body-tips {
        display: flex;
        align-items: center;
        font-size: 0.875rem;
        border: 1px solid;
        border-color: rgb(199 210 254 / var(--tw-border-opacity, 1));
        border-radius: 10px;
        padding: 0 11px;
        background-color: #eef2ff;
        min-height: 46px;
        color: rgb(55 48 163);
      }
      .countersign-form {
        margin-top: 16px;
      }
    `,
  ],
})
export class CountersignAffirmDialogComponent implements OnInit {
  // 输入输出
  readonly open = input<boolean>(false);
  readonly submitting = input<boolean>(false);

  readonly submit = output<CountersignData>();
  readonly cancel = output<void>();

  // 加签人选项
  protected countersignToOptions = [
    { label: '项目经理 · 赵宇', value: 'zhaoyu' },
    { label: '行政负责人 · 刘倩', value: 'liuqian' },
    { label: '财务经理 · 周宁', value: 'zhouning' },
  ];

  // 加签方式选项
  protected countersignMethodOptions = [
    { label: '顺序加签：加签人确认后回到我', value: 'sequential' },
    { label: '并行加签：加签人与我同时处理', value: 'parallel' },
  ];

  // 表单数据
  protected formData: CountersignData = {
    countersignTo: null,
    countersignMethod: null,
    description: '',
  };

  // 表单验证
  protected get isFormValid(): boolean {
    return (
      !!this.formData.countersignTo &&
      !!this.formData.countersignMethod &&
      !!this.formData.description
    );
  }
  // 记录上一次的 open 状态
  private previousOpenState = false;
  constructor() {
    effect(() => {
      const currentOpen = this.open();
      if (this.previousOpenState === true && currentOpen === false) {
        this.resetForm();
      }
      this.previousOpenState = currentOpen;
    });
  }
  ngOnInit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.formData = {
      countersignTo: null,
      countersignMethod: null,
      description: '',
    };
  }

  protected onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  protected onSubmit(): void {
    if (!this.isFormValid) {
      return;
    }
    this.submit.emit(this.formData);
  }
}
