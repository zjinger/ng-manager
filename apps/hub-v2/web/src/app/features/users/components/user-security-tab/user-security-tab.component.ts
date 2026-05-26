import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import type { UserEntity } from '../../models/user.model';

const PASSWORD_LOWER = 'abcdefghijkmnopqrstuvwxyz';
const PASSWORD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASSWORD_DIGITS = '23456789';
const PASSWORD_SYMBOLS = '!@#$%&*';
const PASSWORD_ALL = `${PASSWORD_LOWER}${PASSWORD_UPPER}${PASSWORD_DIGITS}${PASSWORD_SYMBOLS}`;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 32;

function randomIndex(max: number): number {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function pickChar(chars: string): string {
  return chars[randomIndex(chars.length)];
}

function shuffleChars(chars: string[]): string {
  const next = [...chars];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next.join('');
}

function generateTemporaryPassword(): string {
  const chars = [
    pickChar(PASSWORD_UPPER),
    pickChar(PASSWORD_LOWER),
    pickChar(PASSWORD_DIGITS),
    pickChar(PASSWORD_SYMBOLS),
  ];
  while (chars.length < 14) {
    chars.push(pickChar(PASSWORD_ALL));
  }
  return shuffleChars(chars);
}

function validateTemporaryPassword(password: string): string {
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
  selector: 'app-user-security-tab',
  imports: [FormsModule, NzButtonModule, NzFormModule, NzIconModule, NzInputModule, NzSwitchModule],
  template: `
    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="lock" nzTheme="outline" />
        密码管理
      </div>
      <nz-form-item>
        <nz-form-label nzFor="generatedPassword">重置密码</nz-form-label>
        <nz-form-control>
          <div class="security-password-row">
            <input
              nz-input
              id="generatedPassword"
              [ngModel]="generatedPassword() || ''"
              (ngModelChange)="updatePasswordDraft($event)"
              name="generatedPassword"
              placeholder="点击重新生成密码"
              autocomplete="new-password"
              [disabled]="!loginEnabled() || busy() || !passwordDraftDirty()"
              [maxlength]="32"
            />
            <button nz-button type="button" [disabled]="!loginEnabled() || busy()" (click)="regeneratePassword()">
              <nz-icon nzType="reload" nzTheme="outline" />
              重新生成
            </button>
          </div>
          <span class="user-form-hint">
            @if (passwordError()) {
              <span class="user-form-hint__error">{{ passwordError() }}</span>
            } @else if (passwordDraftDirty() && generatedPassword()) {
              保存修改后会把该密码设为用户的新临时密码，并要求下次登录修改。
            } @else {
              点击重新生成后可手动调整，并随保存修改一并重置密码。{{ loginEnabled() ? '' : '请先启用后台登录。' }}
            }
          </span>
        </nz-form-control>
      </nz-form-item>
    </section>

    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="safety-certificate" nzTheme="outline" />
        安全策略
      </div>
      <div class="status-card-list">
        <div class="status-card">
          <div class="status-card__info">
            <strong>双因素认证（2FA）</strong>
            <span>需要服务端补充用户级 2FA 配置、密钥与校验能力。</span>
          </div>
          <span class="placeholder-card__tag">待接入</span>
        </div>
        <div class="status-card">
          <div class="status-card__info">
            <strong>允许远程登录</strong>
            <span>需要服务端补充登录来源限制和 IP 策略。</span>
          </div>
          <span class="placeholder-card__tag">待接入</span>
        </div>
        <div class="status-card">
          <div class="status-card__info">
            <strong>强制下次修改密码</strong>
            <span>{{ passwordChangeHint() }}</span>
          </div>
          <nz-switch
            [ngModel]="mustChangePassword()"
            name="mustChangePassword"
            [nzDisabled]="switchDisabled()"
            [nzCheckedChildren]="'要求'"
            [nzUnCheckedChildren]="'关闭'"
            (ngModelChange)="mustChangePasswordChange.emit(!!$event)"
          ></nz-switch>
        </div>
      </div>
    </section>
  `,
  styles: `
    .user-form-section {
      display: flex;
      flex-direction: column;
    }

    .user-form-section + .user-form-section {
      padding-top: 20px;
      border-top: 1px solid var(--border-color-soft);
    }

    .user-form-section__title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .user-form-section__title nz-icon {
      color: var(--color-primary);
    }

    .user-form-hint {
      display: inline-block;
      margin-top: 6px;
      color: var(--text-muted);
      font-size: 12px;
    }

    .user-form-hint__error {
      color: var(--color-danger);
    }

    .security-password-row {
      display: flex;
      gap: 8px;
    }

    .security-password-row input {
      flex: 1;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }

    .status-card-list {
      display: grid;
      gap: 10px;
    }

    .status-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-subtle);
    }

    .status-card__info {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .status-card__info strong {
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 600;
    }

    .status-card__info span {
      color: var(--text-muted);
      font-size: 12px;
    }

    .placeholder-card__tag {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--bg-container);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
    }

    @media (max-width: 720px) {
      .security-password-row,
      .status-card {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSecurityTabComponent {
  readonly user = input.required<UserEntity>();
  readonly loginEnabled = input(false);
  readonly mustChangePassword = input(false);
  readonly busy = input(false);
  readonly mustChangePasswordChange = output<boolean>();
  readonly passwordDraftChange = output<string | null>();
  readonly passwordDraftValidityChange = output<boolean>();

  readonly generatedPassword = signal('');
  readonly passwordDraftDirty = signal(false);
  readonly passwordError = computed(() => {
    const password = this.generatedPassword().trim();
    if (!this.passwordDraftDirty() || !password) {
      return '';
    }
    return validateTemporaryPassword(password);
  });
  readonly switchDisabled = computed(() => {
    const user = this.user();
    return !this.loginEnabled() || user.mustChangePassword || this.busy();
  });
  readonly passwordChangeHint = computed(() => {
    const user = this.user();
    if (!this.loginEnabled()) {
      return '该用户当前未启用后台登录，请先启用后再设置。';
    }
    if (user.mustChangePassword) {
      return '该用户下次登录时需要先修改密码。';
    }
    if (this.mustChangePassword()) {
      return '保存修改后，该用户下次登录时需要先修改密码。';
    }
    return '要求该用户下次登录后先修改密码。';
  });

  regeneratePassword(): void {
    const password = generateTemporaryPassword();
    this.generatedPassword.set(password);
    this.passwordDraftDirty.set(true);
    this.emitPasswordDraft(password);
  }

  updatePasswordDraft(value: string): void {
    const password = value.trim();
    this.generatedPassword.set(value);
    this.passwordDraftDirty.set(!!password);
    this.emitPasswordDraft(password);
  }

  private emitPasswordDraft(password: string): void {
    if (!password) {
      this.passwordDraftChange.emit(null);
      this.passwordDraftValidityChange.emit(true);
      return;
    }

    const error = validateTemporaryPassword(password);
    this.passwordDraftChange.emit(error ? null : password);
    this.passwordDraftValidityChange.emit(!error);
  }
}
