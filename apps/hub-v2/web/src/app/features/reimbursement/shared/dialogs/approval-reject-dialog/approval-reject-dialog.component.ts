import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent, FormActionsComponent } from '@app/shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

export interface ApprovalRejectData {
  // 已移除 remark 字段
}

@Component({
  selector: 'approval-reject-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogShellComponent,
    FormActionsComponent,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-shell
      [open]="open()"
      [center]="true"
      [width]="520"
      title="驳回单据"
      [subtitle]="''"
      [modalClass]="'approval-reject-modal'"
      (cancel)="onCancel()"
    >
      <div dialog-body>
        <!-- 提示信息 -->
        <div class="dialog-body-tips-wrapper">
          <span class="dialog-body-text">驳回后单据将退回给报销人修改。</span>
        </div>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="onCancel()">取消</button>
          <button
            nz-button
            type="button"
            nzType="primary"
            [nzLoading]="submitting()"
            (click)="onSubmit()"
          >
            确定驳回
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
        line-height: 1.5;
      }
    `,
  ],
})
export class ApprovalRejectDialogComponent implements OnInit {
  // 输入输出
  readonly open = input<boolean>(false);
  readonly submitting = input<boolean>(false);

  readonly submit = output<ApprovalRejectData>();
  readonly cancel = output<void>();

  // 表单数据
  protected formData: ApprovalRejectData = {};
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
    this.formData = {};
  }

  protected onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  protected onSubmit(): void {
    this.submit.emit(this.formData);
  }
}
