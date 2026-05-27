import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import type { RdTaskSheetDetail, ReturnReviewRdTaskSheetInput } from '../../models/rd-task-sheet.model';

@Component({
  selector: 'app-rd-task-sheet-review-return-dialog',
  standalone: true,
  imports: [FormsModule, NzFormModule, NzButtonModule, NzIconModule, NzInputModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="520"
      title="退回任务单"
      subtitle="填写退回原因，制单人可修改后重新提交审核。"
      icon="rollback"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-task-sheet-return-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <nz-form-item>
            <nz-form-label>任务单</nz-form-label>
            <nz-form-control>
              <input nz-input [ngModel]="detailTitle()" name="title" disabled />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>退回原因</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="4"
                name="comment"
                placeholder="说明需要补充或修正的内容"
                [ngModel]="comment()"
                (ngModelChange)="comment.set($event)"
              ></textarea>
            </nz-form-control>
          </nz-form-item>
        </form>
      </div>

      <app-form-actions dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzDanger form="rd-task-sheet-return-form" [nzLoading]="busy()">
          <nz-icon nzType="rollback" />
          确认退回
        </button>
      </app-form-actions>
    </app-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetReviewReturnDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly cancel = output<void>();
  readonly confirm = output<ReturnReviewRdTaskSheetInput>();

  readonly comment = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.comment.set('');
      }
    });
  }

  detailTitle(): string {
    const detail = this.detail();
    return detail ? `${detail.sheetNo} ${detail.title}` : '';
  }

  submitForm(): void {
    this.confirm.emit({ comment: this.comment().trim() || null });
  }
}
