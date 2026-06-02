import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';

import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 32;

function validatePassword(password: string): string {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return '密码长度需为 8~32 位。';
  }
  if (/\s/.test(password)) {
    return '密码不能包含空格。';
  }

  const typeCount = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (typeCount < 2) {
    return '密码需包含大写字母、小写字母、数字、特殊字符中的至少两类。';
  }

  return '';
}

@Component({
  selector: 'app-force-password-change-dialog',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="visible()"
      [nzFooter]="null"
      [nzWidth]="520"
      [nzClosable]="false"
      [nzKeyboard]="false"
      [nzMaskClosable]="false"
      nzClassName="force-password-change-modal"
    >
      <ng-container *nzModalContent>
        <div class="force-password-dialog">
          <div class="force-password-dialog__header">
            <div class="force-password-dialog__icon">
              <nz-icon nzType="lock" nzTheme="outline" />
            </div>
            <div>
              <h2>修改登录密码</h2>
              <p>当前账号需要先修改密码，完成后才能继续使用系统。</p>
            </div>
          </div>

          <nz-alert
            nzType="warning"
            nzShowIcon
            nzMessage="请设置一个新的登录密码"
            nzDescription="新密码保存成功后，本次登录会继续保留。"
          />

          <form nz-form nzLayout="vertical" [formGroup]="form" autocomplete="off" (ngSubmit)="submit()">
            <input class="hidden-autofill" type="text" name="forced_fake_account" autocomplete="username" tabindex="-1" />
            <input class="hidden-autofill" type="password" name="forced_fake_password" autocomplete="current-password" tabindex="-1" />

            <nz-form-item>
              <nz-form-label nzRequired nzFor="force-old-password">当前密码</nz-form-label>
              <nz-form-control>
                <nz-input-password>
                  <input
                    id="force-old-password"
                    nz-input
                    type="password"
                    formControlName="oldPassword"
                    autocomplete="current-password"
                  />
                </nz-input-password>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired nzFor="force-new-password">新密码</nz-form-label>
              <nz-form-control>
                <nz-input-password>
                  <input
                    id="force-new-password"
                    nz-input
                    type="password"
                    formControlName="newPassword"
                    autocomplete="new-password"
                    maxlength="32"
                  />
                </nz-input-password>
                @if (passwordError()) {
                  <span class="password-error">{{ passwordError() }}</span>
                } @else {
                  <span class="password-note">密码长度 8~32 位，至少包含大写字母、小写字母、数字、特殊字符中的两类。</span>
                }
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired nzFor="force-confirm-password">确认新密码</nz-form-label>
              <nz-form-control>
                <nz-input-password>
                  <input
                    id="force-confirm-password"
                    nz-input
                    type="password"
                    formControlName="confirmPassword"
                    autocomplete="new-password"
                    maxlength="32"
                  />
                </nz-input-password>
                @if (confirmError()) {
                  <span class="password-error">{{ confirmError() }}</span>
                }
              </nz-form-control>
            </nz-form-item>

            <div class="force-password-dialog__footer">
              <button nz-button nzType="primary" type="submit" [nzLoading]="busy()" [disabled]="!canSubmit()">
                <nz-icon nzType="check" nzTheme="outline" />
                保存新密码
              </button>
            </div>
          </form>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: `
    .force-password-dialog {
      display: grid;
      gap: 18px;
    }

    .force-password-dialog__header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .force-password-dialog__icon {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-size: 22px;
      flex: 0 0 auto;
    }

    .force-password-dialog__header h2 {
      margin: 0;
      color: var(--text-heading);
      font-size: 18px;
      font-weight: 700;
    }

    .force-password-dialog__header p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 13px;
    }

    .password-note,
    .password-error {
      display: block;
      margin-top: 6px;
      font-size: 12px;
    }

    .password-note {
      color: var(--text-muted);
    }

    .password-error {
      color: var(--color-danger);
    }

    .force-password-dialog__footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForcePasswordChangeDialogComponent {
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly message = inject(NzMessageService);

  readonly busy = signal(false);
  readonly form = this.fb.nonNullable.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
  });
  readonly formValue = toSignal(this.form.valueChanges.pipe(
    map(() => this.form.getRawValue()),
    startWith(this.form.getRawValue())
  ), {
    initialValue: this.form.getRawValue(),
  });
  readonly visible = computed(() => this.authStore.currentUser()?.mustChangePassword === true);
  readonly passwordError = computed(() => {
    const value = this.formValue();
    const password = value.newPassword.trim();
    if (!password) {
      return '';
    }
    if (value.oldPassword && value.oldPassword === value.newPassword) {
      return '新密码不能与当前密码相同。';
    }
    return validatePassword(password);
  });
  readonly confirmError = computed(() => {
    const value = this.formValue();
    if (!value.confirmPassword) {
      return '';
    }
    return value.newPassword === value.confirmPassword ? '' : '两次输入的新密码不一致。';
  });
  readonly canSubmit = computed(() => {
    const value = this.formValue();
    return (
      !this.busy() &&
      !!value.oldPassword.trim() &&
      !!value.newPassword.trim() &&
      !!value.confirmPassword.trim() &&
      !this.passwordError() &&
      !this.confirmError()
    );
  });

  submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.busy.set(true);
    this.authService.changePassword({
      oldPassword: value.oldPassword,
      newPassword: value.newPassword,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.reset();
        this.message.success('密码已修改');
      },
      error: () => {
        this.busy.set(false);
        this.message.error('密码修改失败，请检查当前密码后重试');
      },
    });
  }
}
