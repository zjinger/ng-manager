import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PanelCardComponent } from '@shared/ui/panel-card';
import { SystemSettingsApiService, type SecuritySettings } from '../../services/system-settings-api.service';

interface PasswordPolicy {
  minPasswordLength: number;
  requireComplexity: boolean;
  passwordExpiry: number;
  loginFailureLock: number;
}

interface TwoFactorSettings {
  globalForce2FA: boolean;
  adminForce2FA: boolean;
  sessionTimeout: number;
}

@Component({
  selector: 'app-security-settings',
  imports: [
    FormsModule,
    NzSelectModule,
    NzSwitchModule,
    NzButtonModule,
    NzIconModule,
    PanelCardComponent,
  ],
  template: `
    <div class="settings-section">
      <app-panel-card title="密码策略">
        <div panel-actions class="settings-actions">
          @if (!passwordEditable()) {
            <button nz-button (click)="startEditPassword()">编辑</button>
          } @else {
            <button nz-button (click)="cancelPassword()" [disabled]="passwordSaving()">取消</button>
            <button
              nz-button
              nzType="primary"
              (click)="savePassword()"
              [disabled]="!passwordDirty() || passwordSaving()"
            >
              {{ passwordSaving() ? '保存中…' : '保存' }}
            </button>
          }
        </div>

        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">最小密码长度</div>
              <div class="settings-item__desc">用户密码的最少字符数</div>
            </div>
            <nz-select
              [(ngModel)]="minPasswordLength"
              style="width: 100px"
              [nzDisabled]="!passwordEditable()"
            >
              <nz-option [nzLabel]="'6 位'" [nzValue]="6" />
              <nz-option [nzLabel]="'8 位'" [nzValue]="8" />
              <nz-option [nzLabel]="'10 位'" [nzValue]="10" />
              <nz-option [nzLabel]="'12 位'" [nzValue]="12" />
            </nz-select>
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">密码复杂度要求</div>
              <div class="settings-item__desc">必须包含大写、小写、数字和特殊字符</div>
            </div>
            <nz-switch
              [(ngModel)]="requireComplexity"
              [nzDisabled]="!passwordEditable()"
            />
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">密码有效期（天）</div>
              <div class="settings-item__desc">强制用户定期更换密码</div>
            </div>
            <nz-select
              [(ngModel)]="passwordExpiry"
              style="width: 120px"
              [nzDisabled]="!passwordEditable()"
            >
              <nz-option nzLabel="30 天" [nzValue]="30" />
              <nz-option nzLabel="90 天" [nzValue]="90" />
              <nz-option nzLabel="180 天" [nzValue]="180" />
              <nz-option nzLabel="永不过期" [nzValue]="0" />
            </nz-select>
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">登录失败锁定</div>
              <div class="settings-item__desc">连续失败次数达到阈值后自动锁定账号</div>
            </div>
            <nz-select
              [(ngModel)]="loginFailureLock"
              style="width: 120px"
              [nzDisabled]="!passwordEditable()"
            >
              <nz-option nzLabel="3 次" [nzValue]="3" />
              <nz-option nzLabel="5 次" [nzValue]="5" />
              <nz-option nzLabel="10 次" [nzValue]="10" />
              <nz-option nzLabel="关闭" [nzValue]="0" />
            </nz-select>
          </div>
        </div>
      </app-panel-card>

      <app-panel-card title="双因素认证 (2FA)">
        <div panel-actions class="settings-actions">
          @if (!twoFAEditable()) {
            <button nz-button (click)="startEditTwoFA()">编辑</button>
          } @else {
            <button nz-button (click)="cancelTwoFA()" [disabled]="twoFASaving()">取消</button>
            <button
              nz-button
              nzType="primary"
              (click)="saveTwoFA()"
              [disabled]="!twoFADirty() || twoFASaving()"
            >
              {{ twoFASaving() ? '保存中…' : '保存' }}
            </button>
          }
        </div>

        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">全局强制 2FA</div>
              <div class="settings-item__desc">要求所有用户启用双因素认证</div>
            </div>
            <nz-switch
              [(ngModel)]="globalForce2FA"
              [nzDisabled]="!twoFAEditable()"
            />
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">管理员强制 2FA</div>
              <div class="settings-item__desc">要求所有管理员角色必须启用 2FA</div>
            </div>
            <nz-switch
              [(ngModel)]="adminForce2FA"
              [nzDisabled]="!twoFAEditable()"
            />
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">会话超时（分钟）</div>
              <div class="settings-item__desc">无操作后自动登出的时间</div>
            </div>
            <nz-select
              [(ngModel)]="sessionTimeout"
              style="width: 120px"
              [nzDisabled]="!twoFAEditable()"
            >
              <nz-option nzLabel="15 分钟" [nzValue]="15" />
              <nz-option nzLabel="30 分钟" [nzValue]="30" />
              <nz-option nzLabel="60 分钟" [nzValue]="60" />
              <nz-option nzLabel="120 分钟" [nzValue]="120" />
            </nz-select>
          </div>
        </div>
      </app-panel-card>
    </div>
  `,
  styles: `
    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .settings-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .settings-list {
      padding: 0 20px;
    }

    .settings-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .settings-item:last-child {
      border-bottom: none;
    }

    .settings-item__info {
      flex: 1;
      min-width: 0;
    }

    .settings-item__name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .settings-item__desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecuritySettingsComponent implements OnInit {
  private readonly message = inject(NzMessageService);
  private readonly settingsApi = inject(SystemSettingsApiService);

  readonly passwordEditable = signal(false);
  readonly passwordDirty = signal(false);
  readonly passwordSaving = signal(false);

  readonly twoFAEditable = signal(false);
  readonly twoFADirty = signal(false);
  readonly twoFASaving = signal(false);

  readonly minPasswordLength = signal(10);
  readonly requireComplexity = signal(true);
  readonly passwordExpiry = signal(90);
  readonly loginFailureLock = signal(5);

  readonly globalForce2FA = signal(false);
  readonly adminForce2FA = signal(true);
  readonly sessionTimeout = signal(30);

  private savedPassword: PasswordPolicy = this.getPasswordSnapshot();
  private savedTwoFA: TwoFactorSettings = this.getTwoFASnapshot();

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.settingsApi.getSecuritySettings().subscribe({
      next: (settings) => {
        this.minPasswordLength.set(settings.minPasswordLength);
        this.requireComplexity.set(settings.requireComplexity);
        this.passwordExpiry.set(settings.passwordExpiry);
        this.loginFailureLock.set(settings.loginFailureLock);
        this.globalForce2FA.set(settings.globalForce2FA);
        this.adminForce2FA.set(settings.adminForce2FA);
        this.sessionTimeout.set(settings.sessionTimeout);
        this.savedPassword = this.getPasswordSnapshot();
        this.savedTwoFA = this.getTwoFASnapshot();
      },
      error: () => {
        this.message.error('加载设置失败');
      }
    });
  }

  private getPasswordSnapshot(): PasswordPolicy {
    return {
      minPasswordLength: this.minPasswordLength(),
      requireComplexity: this.requireComplexity(),
      passwordExpiry: this.passwordExpiry(),
      loginFailureLock: this.loginFailureLock(),
    };
  }

  private getTwoFASnapshot(): TwoFactorSettings {
    return {
      globalForce2FA: this.globalForce2FA(),
      adminForce2FA: this.adminForce2FA(),
      sessionTimeout: this.sessionTimeout(),
    };
  }

  startEditPassword(): void {
    this.savedPassword = this.getPasswordSnapshot();
    this.passwordEditable.set(true);
    this.passwordDirty.set(false);
  }

  cancelPassword(): void {
    this.minPasswordLength.set(this.savedPassword.minPasswordLength);
    this.requireComplexity.set(this.savedPassword.requireComplexity);
    this.passwordExpiry.set(this.savedPassword.passwordExpiry);
    this.loginFailureLock.set(this.savedPassword.loginFailureLock);
    this.passwordEditable.set(false);
    this.passwordDirty.set(false);
  }

  savePassword(): void {
    this.passwordSaving.set(true);
    const data: SecuritySettings = {
      ...this.getPasswordSnapshot(),
      globalForce2FA: this.globalForce2FA(),
      adminForce2FA: this.adminForce2FA(),
      sessionTimeout: this.sessionTimeout(),
    };
    this.settingsApi.updateSecuritySettings(data).subscribe({
      next: () => {
        this.savedPassword = this.getPasswordSnapshot();
        this.passwordSaving.set(false);
        this.passwordEditable.set(false);
        this.passwordDirty.set(false);
        this.message.success('密码策略已保存');
      },
      error: () => {
        this.passwordSaving.set(false);
        this.message.error('保存失败');
      }
    });
  }

  startEditTwoFA(): void {
    this.savedTwoFA = this.getTwoFASnapshot();
    this.twoFAEditable.set(true);
    this.twoFADirty.set(false);
  }

  cancelTwoFA(): void {
    this.globalForce2FA.set(this.savedTwoFA.globalForce2FA);
    this.adminForce2FA.set(this.savedTwoFA.adminForce2FA);
    this.sessionTimeout.set(this.savedTwoFA.sessionTimeout);
    this.twoFAEditable.set(false);
    this.twoFADirty.set(false);
  }

  saveTwoFA(): void {
    this.twoFASaving.set(true);
    const data: SecuritySettings = {
      minPasswordLength: this.minPasswordLength(),
      requireComplexity: this.requireComplexity(),
      passwordExpiry: this.passwordExpiry(),
      loginFailureLock: this.loginFailureLock(),
      ...this.getTwoFASnapshot(),
    };
    this.settingsApi.updateSecuritySettings(data).subscribe({
      next: () => {
        this.savedTwoFA = this.getTwoFASnapshot();
        this.twoFASaving.set(false);
        this.twoFAEditable.set(false);
        this.twoFADirty.set(false);
        this.message.success('双因素认证设置已保存');
      },
      error: () => {
        this.twoFASaving.set(false);
        this.message.error('保存失败');
      }
    });
  }

  checkPasswordDirty(): void {
    const current = this.getPasswordSnapshot();
    this.passwordDirty.set(
      current.minPasswordLength !== this.savedPassword.minPasswordLength ||
      current.requireComplexity !== this.savedPassword.requireComplexity ||
      current.passwordExpiry !== this.savedPassword.passwordExpiry ||
      current.loginFailureLock !== this.savedPassword.loginFailureLock
    );
  }

  checkTwoFADirty(): void {
    const current = this.getTwoFASnapshot();
    this.twoFADirty.set(
      current.globalForce2FA !== this.savedTwoFA.globalForce2FA ||
      current.adminForce2FA !== this.savedTwoFA.adminForce2FA ||
      current.sessionTimeout !== this.savedTwoFA.sessionTimeout
    );
  }
}
