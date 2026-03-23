import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import type { IssueEntity } from '../../models/issue.model';

export type IssueTransitionMode = 'resolve' | 'reopen';

@Component({
  selector: 'app-issue-transition-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      [title]="title()"
      [subtitle]="issue() ? issue()!.title : subtitle()"
      [icon]="mode() === 'resolve' ? 'check-circle' : 'rollback'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="issue-transition-form" class="transition-form" (ngSubmit)="submitForm()">
          <label class="transition-field dialog-field">
            <span class="transition-field__label dialog-field__label">{{ fieldLabel() }}</span>
            <textarea
              nz-input
              rows="6"
              [placeholder]="placeholder()"
              [ngModel]="content()"
              name="content"
              (ngModelChange)="content.set($event)"
            ></textarea>
          </label>
        </form>
      </div>

      <div dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="!content().trim()" [nzLoading]="busy()" type="submit" form="issue-transition-form">
          {{ confirmText() }}
        </button>
      </div>
    </app-dialog-shell>
  `,
  styles: [
    `
      .transition-form {
        display: grid;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueTransitionDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly mode = input<IssueTransitionMode>('resolve');
  readonly issue = input<IssueEntity | null>(null);
  readonly confirm = output<{ content: string }>();
  readonly cancel = output<void>();

  readonly content = signal('');

  readonly title = computed(() => (this.mode() === 'resolve' ? '标记解决' : '重新打开'));
  readonly subtitle = computed(() => (this.mode() === 'resolve' ? '填写本次处理结果。' : '说明重开的原因。'));
  readonly fieldLabel = computed(() => (this.mode() === 'resolve' ? '解决说明' : '重开说明'));
  readonly confirmText = computed(() => (this.mode() === 'resolve' ? '确认解决' : '确认重开'));
  readonly placeholder = computed(() =>
    this.mode() === 'resolve' ? '例如：已替换为主题变量，并补齐 hover 阴影。' : '例如：验收时发现暗黑态还有一处浅色残留。'
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.content.set('');
      }
    });
  }

  submitForm(): void {
    const value = this.content().trim();
    if (!value) {
      return;
    }
    this.confirm.emit({ content: value });
  }
}
