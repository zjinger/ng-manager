import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { FormActionsComponent, PanelCardComponent } from '@shared/ui';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
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
  imports: [
    FormsModule,
    NzFormModule,
    NzGridModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    PanelCardComponent,
    FormActionsComponent,
  ],
  template: `
    <app-panel-card title="修改密码">
      <div class="profile-form">
        <form
          nz-form
          nzLayout="vertical"
          class="profile-form"
          autocomplete="off"
          (ngSubmit)="submitForm()"
        >
          <!-- 用于干扰浏览器自动填充 -->
          <input class="hidden-autofill" type="text" name="fake_account" autocomplete="username" tabindex="-1" />
          <input class="hidden-autofill" type="password" name="fake_password" autocomplete="current-password" tabindex="-1" />

          <div nz-row nzGutter="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="old-password-input">当前密码</nz-form-label>
                <nz-form-control>
                  <input
                    id="old-password-input"
                    nz-input
                    type="password"
                    autocomplete="current-password"
                    readonly
                    (focus)="unlockInput($event)"
                    [ngModel]="form().oldPassword"
                    name="current_pwd_value"
                    (ngModelChange)="updateField('oldPassword', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="new-password-input">新密码</nz-form-label>
                <nz-form-control>
                  <input
                    id="new-password-input"
                    nz-input
                    type="password"
                    autocomplete="new-password"
                    readonly
                    (focus)="unlockInput($event)"
                    [ngModel]="form().newPassword"
                    name="next_pwd_value"
                    (ngModelChange)="updateField('newPassword', $event)"
                  />
                  <span class="password-note">密码长度 8~32 位，建议同时包含字母和数字。</span>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="confirm-password-input">确认新密码</nz-form-label>
                <nz-form-control>
                  <input
                    id="confirm-password-input"
                    nz-input
                    type="password"
                    autocomplete="new-password"
                    readonly
                    (focus)="unlockInput($event)"
                    [ngModel]="form().confirmPassword"
                    name="confirm_pwd_value"
                    (ngModelChange)="updateField('confirmPassword', $event)"
                  />
                  @if (form().confirmPassword && form().confirmPassword !== form().newPassword) {
                    <span class="password-error">两次输入的新密码不一致。</span>
                  }
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <app-form-actions>
            <button nz-button type="button" (click)="resetForm()">取消</button>
            <button
              nz-button
              nzType="primary"
              type="submit"
              [nzLoading]="busy()"
              [disabled]="!canSubmit()"
            >
              <nz-icon nzType="check" />
              修改密码
            </button>
          </app-form-actions>
        </form>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .profile-form {
        padding: 24px;
      }

      .password-note {
        display: block;
        margin-top: 4px;
        color: var(--text-muted);
      }

      .password-error {
        display: block;
        margin-top: 4px;
        color: var(--color-danger);
      }

      .hidden-autofill {
        position: absolute;
        width: 0;
        height: 0;
        opacity: 0;
        pointer-events: none;
        border: 0;
        padding: 0;
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

  unlockInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.removeAttribute('readonly');
  }
}