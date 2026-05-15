import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, model, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent, FormActionsComponent } from '@app/shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';

export interface TransferData {
  transferTo: string | null;
  transferReason: string | null;
  description: string;
}

@Component({
  selector: 'approval-transfer-dialog',
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
      title="转交审批"
      [subtitle]="''"
      [modalClass]="'approval-transfer-modal'"
      (cancel)="onCancel()"
    >
      <div dialog-body>
        <!-- 提示信息 -->
        <div class="dialog-body-tips-wrapper">
          <span class="dialog-body-text"
            >当前节点将由新审批人继续处理，原审批人不再承担本节点审批责任。</span
          >
          <div class="dialog-body-tips">适用于审批人请假、流转错误、职责变更等场景。</div>
        </div>

        <!-- 表单 -->
        <form nz-form [nzLayout]="'vertical'" class="transfer-form">
          <!-- 第一行：转交人、转交原因 -->
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>转交给</nz-form-label>
                <nz-form-control [nzErrorTip]="'请选择转交人'">
                  <nz-select
                    nzPlaceHolder="请选择转交人"
                    [(ngModel)]="formData.transferTo"
                    name="transferTo"
                    [nzAllowClear]="true"
                  >
                    @for (item of transferToOptions; track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>转交原因</nz-form-label>
                <nz-form-control [nzErrorTip]="'请选择转交原因'">
                  <nz-select
                    nzPlaceHolder="请选择转交原因"
                    [(ngModel)]="formData.transferReason"
                    name="transferReason"
                    [nzAllowClear]="true"
                  >
                    @for (item of transferReasonOptions; track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- 第二行：说明 -->
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label nzRequired>说明</nz-form-label>
                <nz-form-control nzErrorTip="请输入说明">
                  <textarea
                    nzRequired
                    nz-input
                    rows="4"
                    placeholder="例如：本人本周出差，由代理主管李明处理该报销单。"
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
            确定转交
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
        border: 1px solid rgb(253 230 138);
        border-radius: 10px;
        padding: 0 11px;
        background-color: #fffbeb;
        min-height: 46px;
        color: rgb(146 64 14);
      }
      .transfer-form {
        margin-top: 16px;
      }
    `,
  ],
})
export class ApprovalTransferDialogComponent implements OnInit {
  // 输入输出
  readonly open = input<boolean>(false);
  readonly submitting = input<boolean>(false);

  readonly submit = output<TransferData>();
  readonly cancel = output<void>();

  // 转交人选项
  protected transferToOptions = [
    { label: '李明 · 代理主管', value: 'liming' },
    { label: '王珊 · 部门负责人', value: 'wangshan' },
    { label: '周宁 · 财务经理', value: 'zhouning' },
  ];

  // 转交原因选项
  protected transferReasonOptions = [
    { label: '审批人不在岗', value: 'offline' },
    { label: '流转到错误负责人', value: 'wrong_person' },
    { label: '职责不匹配', value: 'duty_mismatch' },
    { label: '其他原因', value: 'other' },
  ];

  // 表单数据
  protected formData: TransferData = {
    transferTo: null,
    transferReason: null,
    description: '',
  };

  // 表单验证
  protected get isFormValid(): boolean {
    return (
      !!this.formData.transferTo && !!this.formData.transferReason && !!this.formData.description
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
      transferTo: null,
      transferReason: null,
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
    console.log(this.formData, '转交单');
    this.submit.emit(this.formData);
  }
}
