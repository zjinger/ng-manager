import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, effect, signal } from '@angular/core';
import { DialogShellComponent, FormActionsComponent } from '@app/shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CreateReimbursementClaimInput } from '@app/features/reimbursement/models/reimbursement.model';
import { ExpenseBillPreviewComponent } from '../../components';

@Component({
  selector: 'ex-save-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogShellComponent,
    FormActionsComponent,
    NzButtonModule,
    ExpenseBillPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-shell
      [open]="open()"
      [center]="true"
      [width]="1200"
      title="差旅费预览"
      [subtitle]="'请确认报销信息无误后提交'"
      [modalClass]="'expense-preview-modal'"
      (cancel)="onCancel()"
    >
      <div dialog-body class="preview-body">
        <app-expense-bill-preview [formData]="formData()" />
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="onConfirm('draft')">保存草稿</button>
          <button nz-button type="button" nzType="primary" (click)="onConfirm('submit')">
            提交审批
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .preview-body {
        max-height: 70vh;
        overflow-y: auto;
        padding: 16px 0;
      }

      /* 滚动条样式 */
      .preview-body::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .preview-body::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      .preview-body::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }

      .preview-body::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }

      /* 暗色主题滚动条 */
      :host-context(html[data-theme='dark']) {
        .preview-body::-webkit-scrollbar-track {
          background: #334155;
        }

        .preview-body::-webkit-scrollbar-thumb {
          background: #64748b;
        }

        .preview-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      }
    `,
  ],
})
export class ExSaveDialogComponent {
  // 输入输出
  readonly open = input<boolean>(false);
  readonly formData = input<CreateReimbursementClaimInput>({
    claimType: 'travel',
    departmentId: '',
    departmentName: '',
    applicantName: '',
    titleName: '',
    reason: '',
    fillDate: '',
    advanceAmount: 0,
    travelStartDate: null,
    travelStartHalf: null,
    travelEndDate: null,
    travelEndHalf: null,
    travelDays: null,
    receiptCount: null,
    items: [],
  });

  readonly confirm = output<string>(); // 保存草稿或确认并提交 draft -- submit
  readonly cancel = output<void>();

  // 记录上一次的 open 状态，用于重置
  private previousOpenState = false;

  constructor() {
    effect(() => {
      const currentOpen = this.open();
      if (this.previousOpenState === true && currentOpen === false) {
        // 弹窗关闭时的清理逻辑
      }
      this.previousOpenState = currentOpen;
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onConfirm(item: string | null): void {
    this.confirm.emit(item || 'draft');
  }
}
