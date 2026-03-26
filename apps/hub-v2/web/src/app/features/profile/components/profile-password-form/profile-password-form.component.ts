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
  imports: [FormsModule, NzFormModule, NzGridModule, NzButtonModule, NzInputModule, NzIconModule, PanelCardComponent, FormActionsComponent],
  template: `
    <app-panel-card title="修改密码">
       <div class="profile-form">
       <form nz-form nzLayout="vertical" class="profile-form">
          <div nz-row nzGutter="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="oldPassword">当前密码</nz-form-label>
                <nz-form-control>
                  <input nz-input type="password" [ngModel]="form().oldPassword" name="oldPassword" (ngModelChange)="updateField('oldPassword', $event)" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          <div nz-row nzGutter="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="newPassword">新密码</nz-form-label>
                <nz-form-control>
                  <input nz-input type="password" [ngModel]="form().newPassword" name="newPassword" (ngModelChange)="updateField('newPassword', $event)" />
                  <span class="password-note">密码长度 8~32 位，建议同时包含字母和数字。</span>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="confirmPassword">确认新密码</nz-form-label>
                <nz-form-control>
                  <input nz-input type="password" [ngModel]="form().confirmPassword" name="confirmPassword" (ngModelChange)="updateField('confirmPassword', $event)" />
                  @if (form().confirmPassword && form().confirmPassword !== form().newPassword) {
                    <span class="password-error">两次输入的新密码不一致。</span>
                  }
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
           <app-form-actions>
            <button nz-button type="button" (click)="resetForm()">取消</button>
            <button nz-button nzType="primary" type="submit" [nzLoading]="busy()" (click)="submitForm()" [disabled]="!canSubmit()">
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
      .password-note {
        display: block;
        margin-top: 4px;
        color: var(--text-muted);
      }
      .profile-form {
        padding: 24px;
      }
      .password-error{
        display: block;
        margin-top: 4px;
        color: var(--color-danger);
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
