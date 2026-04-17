import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSliderModule } from 'ng-zorro-antd/slider';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';

@Component({
  selector: 'app-rd-progress-update-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSliderModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="520"
      [title]="'更新我的进度'"
      [subtitle]="''"
      [icon]="'edit'"
      (cancel)="onCancel()"
    >
      <div dialog-body>
        <div class="progress-field">
          <label>成员</label>
          <div class="progress-field__member">{{ memberName() }}</div>
        </div>

        <div class="progress-field">
          <label>进度值</label>
          <div class="progress-field__slider">
            <nz-slider
              [nzMin]="0"
              [nzMax]="100"
              [nzStep]="5"
              [ngModel]="progressValue()"
              (ngModelChange)="onSliderChange($event)"
            ></nz-slider>
          </div>
          <div class="progress-field__value">{{ progressValue() }}%</div>
        </div>

        <div class="progress-field">
          <label>进度说明（可选）</label>
          <textarea
            nz-input
            rows="3"
            placeholder="例如：完成了核心模块开发，待联调测试..."
            [ngModel]="progressNote()"
            (ngModelChange)="progressNote.set($event)"
          ></textarea>
        </div>

        <div class="progress-tips">
          <span>💡 仅允许更新自己的进度</span>
        </div>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="onCancel()">取消</button>
          <button nz-button nzType="primary" [nzLoading]="busy()" (click)="onSubmit()">保存进度</button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .progress-field {
        margin-bottom: 20px;
      }
      .progress-field label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      .progress-field__member {
        font-size: 15px;
        font-weight: 700;
        color: var(--text-heading);
        padding: 8px 0;
      }
      .progress-field__slider {
        padding: 0 8px;
      }
      .progress-field__value {
        text-align: center;
        font-size: 32px;
        font-weight: 800;
        color: var(--primary);
        margin-top: 12px;
      }
      .progress-field textarea {
        resize: vertical;
      }
      .progress-tips {
        padding: 12px 14px;
        background: var(--bg-subtle);
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdProgressUpdateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly memberName = input('');
  readonly currentProgress = input(0);

  readonly save = output<{ progress: number; note: string }>();
  readonly cancel = output<void>();

  readonly progressValue = signal(0);
  readonly progressNote = signal('');

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.progressValue.set(this.currentProgress());
      this.progressNote.set('');
    });
  }

  onSliderChange(value: number): void {
    this.progressValue.set(value);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSubmit(): void {
    this.save.emit({
      progress: this.progressValue(),
      note: this.progressNote(),
    });
  }
}
