import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '@shared/ui';
import type { RdItemEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-close-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      [title]="'关闭研发项'"
      [subtitle]="item() ? item()!.title : '填写关闭原因。'"
      [icon]="'close-circle'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-close-form" class="close-form" (ngSubmit)="submitForm()">
          <label class="close-field dialog-field">
            <span class="close-field__label dialog-field__label">关闭原因</span>
            <textarea
              nz-input
              rows="6"
              [placeholder]="'例如：需求取消 / 重复建设 / 当前阶段暂停。'"
              [ngModel]="reason()"
              name="reason"
              (ngModelChange)="reason.set($event)"
            ></textarea>
          </label>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="!reason().trim()" [nzLoading]="busy()" type="submit" form="rd-close-form">
          确认关闭
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .close-form {
        display: grid;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdCloseDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly confirm = output<{ reason: string }>();
  readonly cancel = output<void>();

  readonly reason = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reason.set('');
      }
    });
  }

  submitForm(): void {
    const reason = this.reason().trim();
    if (!reason) {
      return;
    }
    this.confirm.emit({ reason });
  }
}

