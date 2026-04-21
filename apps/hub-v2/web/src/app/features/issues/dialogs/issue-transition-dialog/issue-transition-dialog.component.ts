import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent } from '@shared/ui';
import type { IssueEntity } from '../../models/issue.model';

export type IssueTransitionMode = 'resolve' | 'reopen' | 'close';

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

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button
          nz-button
          nzType="primary"
          [disabled]="reasonRequired() && !content().trim()"
          [nzLoading]="busy()"
          type="submit"
          form="issue-transition-form"
        >
          {{ confirmText() }}
        </button>
      </ng-container>
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
  readonly reasonRequired = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly confirm = output<{ content: string }>();
  readonly cancel = output<void>();

  readonly content = signal('');

  readonly title = computed(() => {
    if (this.mode() === 'resolve') {
      return '标记解决';
    }
    if (this.mode() === 'reopen') {
      return '重新打开';
    }
    return '关闭问题';
  });
  readonly subtitle = computed(() => {
    if (this.mode() === 'resolve') {
      return '填写本次处理结果。';
    }
    if (this.mode() === 'reopen') {
      return '说明重开的原因。';
    }
    return this.reasonRequired() ? '请填写关闭原因。' : '可选填写关闭说明。';
  });
  readonly fieldLabel = computed(() => {
    if (this.mode() === 'resolve') {
      return '解决说明';
    }
    if (this.mode() === 'reopen') {
      return '重开说明';
    }
    return this.reasonRequired() ? '关闭原因' : '关闭说明';
  });
  readonly confirmText = computed(() => {
    if (this.mode() === 'resolve') {
      return '确认解决';
    }
    if (this.mode() === 'reopen') {
      return '确认重开';
    }
    return '确认关闭';
  });
  readonly placeholder = computed(() => {
    if (this.mode() === 'resolve') {
      return '例如：已修复用户登录异常问题，涉及登录模块相关代码变更。';
    }
    if (this.mode() === 'reopen') {
      return '例如：验收时发现还有xx问题未解决。';
    }
    return this.reasonRequired() ? '例如：需求取消 / 重复问题 / 无法复现。' : '可选填写关闭说明。';
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        if(this.mode() === 'resolve') {
          this.content.set('已解决');
        }else{
          this.content.set('');
        }
      }
    });
  }

  submitForm(): void {
    const value = this.content().trim();
    if (!value && this.reasonRequired()) {
      return;
    }
    this.confirm.emit({ content: value });
  }
}
