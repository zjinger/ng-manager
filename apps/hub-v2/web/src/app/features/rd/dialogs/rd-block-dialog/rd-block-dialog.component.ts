import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import type { RdItemEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-block-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="640"
      [title]="'标记为阻塞'"
      [subtitle]="item() ? item()!.title : '记录当前研发项的阻塞原因。'"
      [icon]="'pause-circle'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-block-form" class="block-form" (ngSubmit)="submitForm()">
          <label class="block-field dialog-field">
            <span class="block-field__label dialog-field__label">阻塞原因</span>
            <textarea
              nz-input
              rows="6"
              placeholder="例如：依赖的接口定义尚未冻结，无法继续联调。"
              [ngModel]="reason()"
              name="reason"
              (ngModelChange)="reason.set($event)"
            ></textarea>
          </label>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="!reason().trim()" [nzLoading]="busy()" type="submit" form="rd-block-form">
          确认阻塞
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .block-form {
        display: grid;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdBlockDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly confirm = output<{ blockerReason: string }>();
  readonly cancel = output<void>();

  readonly reason = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reason.set(this.item()?.blockerReason ?? '');
      }
    });
  }

  submitForm(): void {
    const blockerReason = this.reason().trim();
    if (!blockerReason) {
      return;
    }
    this.confirm.emit({ blockerReason });
  }
}
