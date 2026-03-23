import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import { FormActionsComponent } from '../../../../shared/ui/form-actions/form-actions.component';
import type { ChangePasswordInput } from '../../models/profile.model';

interface PasswordFormValue extends ChangePasswordInput {
  confirmPassword: string;
}

const DEFAULT_FORM: PasswordFormValue = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

@Component({
  selector: 'app-profile-password-form',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, PanelCardComponent, FormActionsComponent],
  template: `
    <app-panel-card title="修改密码">
      <form id="profile-password-form" class="dialog-form" (ngSubmit)="submitForm()">
        <label class="dialog-field">
          <span class="dialog-field__label">当前密码 <span class="password-required">*</span></span>
          <input nz-input type="password" [ngModel]="form().oldPassword" name="oldPassword" (ngModelChange)="updateField('oldPassword', $event)" />
        </label>

        <div class="dialog-form__grid password-grid">
          <label class="dialog-field">
            <span class="dialog-field__label">新密码 <span class="password-required">*</span></span>
            <input nz-input type="password" [ngModel]="form().newPassword" name="newPassword" (ngModelChange)="updateField('newPassword', $event)" />
            <span class="password-note">密码长度 8~32 位，建议同时包含字母和数字。</span>
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">确认新密码 <span class="password-required">*</span></span>
            <input nz-input type="password" [ngModel]="form().confirmPassword" name="confirmPassword" (ngModelChange)="updateField('confirmPassword', $event)" />
            @if (form().confirmPassword && form().confirmPassword !== form().newPassword) {
              <span class="password-error">两次输入的新密码不一致。</span>
            }
          </label>
        </div>

        <app-form-actions>
          <button nz-button type="button" (click)="resetForm()">取消</button>
          <button nz-button nzType="primary" type="submit" [nzLoading]="busy()" [disabled]="!canSubmit()">更新密码</button>
        </app-form-actions>
      </form>
    </app-panel-card>
  `,
  styles: [
    `
      .password-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .password-required {
        color: var(--color-danger);
      }

      .password-note {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.7;
      }

      .password-error {
        color: var(--color-danger);
        font-size: 12px;
      }

      @media (max-width: 768px) {
        .password-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePasswordFormComponent {
  readonly busy = input(false);
  readonly submitted = input(false);
  readonly changePassword = output<ChangePasswordInput>();

  readonly form = signal<PasswordFormValue>({ ...DEFAULT_FORM });

  constructor() {
    effect(() => {
      if (this.submitted()) {
        this.form.set({ ...DEFAULT_FORM });
      }
    });
  }

  updateField<K extends keyof PasswordFormValue>(key: K, value: PasswordFormValue[K]): void {
    this.form.update((form) => ({ ...form, [key]: value }));
  }

  canSubmit(): boolean {
    const form = this.form();
    return (
      form.oldPassword.trim().length > 0 &&
      form.newPassword.trim().length >= 8 &&
      form.confirmPassword.trim().length > 0 &&
      form.newPassword === form.confirmPassword
    );
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }

    const form = this.form();
    this.changePassword.emit({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    });
  }

  resetForm(): void {
    this.form.set({ ...DEFAULT_FORM });
  }
}
