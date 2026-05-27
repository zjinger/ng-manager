import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import type { RdTaskSheetDetail, RdTaskSheetResult, ReplyRdTaskSheetInput } from '../../models/rd-task-sheet.model';

type ReplyDraft = {
  result: RdTaskSheetResult;
  resolvedAt: Date | null;
  deliveryContent: string;
};

@Component({
  selector: 'app-rd-task-sheet-reply-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    FormActionsComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="620"
      title="交付 / 答复任务单"
      subtitle="填写处理结果、解决时间和交付答复内容，提交后任务单进入待验证状态。"
      icon="export"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-task-sheet-reply-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <nz-form-item>
            <nz-form-label>任务单</nz-form-label>
            <nz-form-control>
              <input nz-input [ngModel]="detailTitle()" name="title" disabled />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>处理结果</nz-form-label>
            <nz-form-control>
              <nz-select
                name="result"
                [ngModel]="draft().result"
                (ngModelChange)="updateField('result', $event)"
              >
                <nz-option nzLabel="已解决" nzValue="resolved"></nz-option>
                <nz-option nzLabel="未解决" nzValue="unresolved"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>解决时间</nz-form-label>
            <nz-form-control>
              <nz-date-picker
                name="resolvedAt"
                nzFormat="yyyy-MM-dd"
                nzPlaceHolder="选择解决时间"
                [ngModel]="draft().resolvedAt"
                (ngModelChange)="updateField('resolvedAt', $event)"
              ></nz-date-picker>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>交付 / 答复内容</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="6"
                name="deliveryContent"
                placeholder="说明交付内容、处理结论或未解决原因"
                [ngModel]="draft().deliveryContent"
                (ngModelChange)="updateField('deliveryContent', $event)"
              ></textarea>
            </nz-form-control>
          </nz-form-item>
        </form>
      </div>

      <app-form-actions dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" form="rd-task-sheet-reply-form" [disabled]="!isValid()" [nzLoading]="busy()">
          <nz-icon nzType="check" />
          确认交付
        </button>
      </app-form-actions>
    </app-dialog-shell>
  `,
  styles: [
    `
      nz-date-picker {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetReplyDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly cancel = output<void>();
  readonly confirm = output<ReplyRdTaskSheetInput>();

  readonly draft = signal<ReplyDraft>({
    result: 'resolved',
    resolvedAt: new Date(),
    deliveryContent: '',
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const detail = this.detail();
      this.draft.set({
        result: detail?.result ?? 'resolved',
        resolvedAt: parseDateValue(detail?.resolvedAt) ?? new Date(),
        deliveryContent: detail?.deliveryContent ?? '',
      });
    });
  }

  updateField<K extends keyof ReplyDraft>(key: K, value: ReplyDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  detailTitle(): string {
    const detail = this.detail();
    return detail ? `${detail.sheetNo} ${detail.title}` : '';
  }

  isValid(): boolean {
    return this.draft().deliveryContent.trim().length > 0;
  }

  submitForm(): void {
    if (!this.isValid()) {
      return;
    }
    const draft = this.draft();
    this.confirm.emit({
      result: draft.result,
      resolvedAt: draft.resolvedAt ? formatDateValue(draft.resolvedAt) : null,
      deliveryContent: draft.deliveryContent.trim(),
    });
  }
}

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
