import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '@shared/ui';
import type { IssueEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-start-own-branch-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="640"
      [title]="'开始协作'"
      [subtitle]="issue() ? issue()!.title : '填写本次协作内容。'"
      [icon]="'play-circle'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="dialog-body">
        <label class="dialog-field">
          <span class="dialog-field__label">协作内容</span>
          <input
            nz-input
            maxlength="80"
            [ngModel]="title()"
            (ngModelChange)="title.set(($event ?? '').toString())"
            placeholder="例如：补抓包定位登录异常"
          />
          <div class="dialog-field__hint">提交后会自动创建并开始你的协作分支。</div>
        </label>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="disabledSubmit()" [nzLoading]="busy()" (click)="confirmSubmit()">
          开始协作
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .dialog-body {
        display: grid;
        gap: 16px;
      }
      .dialog-field {
        display: grid;
        gap: 8px;
      }
      .dialog-field__label {
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 600;
      }
      .dialog-field__hint {
        color: var(--text-muted);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueStartOwnBranchDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly cancel = output<void>();
  readonly confirm = output<{ title: string }>();

  readonly title = signal('');
  readonly disabledSubmit = computed(() => !this.title().trim());

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.title.set('');
    });
  }

  confirmSubmit(): void {
    const title = this.title().trim();
    if (!title) {
      return;
    }
    this.confirm.emit({ title });
  }
}
