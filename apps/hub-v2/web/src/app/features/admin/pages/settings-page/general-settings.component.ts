import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { PanelCardComponent } from '@shared/ui/panel-card';

interface PlatformInfo {
  platformName: string;
  platformDesc: string;
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
}

interface RegistrationSettings {
  openRegistration: boolean;
  emailWhitelist: string;
  defaultRole: string;
  requireApproval: boolean;
}

@Component({
  selector: 'app-general-settings',
  imports: [
    FormsModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzButtonModule,
    NzIconModule,
    PanelCardComponent,
  ],
  template: `
    <div class="settings-section">
      <app-panel-card title="平台信息">
        <div panel-actions class="settings-actions">
          @if (!platformEditable()) {
            <button nz-button (click)="startEditPlatform()">编辑</button>
          } @else {
            <button nz-button (click)="cancelPlatform()" [disabled]="platformSaving()">取消</button>
            <button
              nz-button
              nzType="primary"
              (click)="savePlatform()"
              [disabled]="!platformDirty() || platformSaving()"
            >
              {{ platformSaving() ? '保存中…' : '保存' }}
            </button>
          }
        </div>

        <div class="settings-form">
          <form nz-form nzLayout="vertical">
            <div nz-row nzGutter="16">
              <div nz-col nzSpan="24">
                <nz-form-item>
                  <nz-form-label nzRequired>平台名称</nz-form-label>
                  <nz-form-control>
                    <input
                      nz-input
                      [(ngModel)]="platformName"
                      name="platformName"
                      placeholder="输入平台名称"
                      [disabled]="!platformEditable()"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>平台描述</nz-form-label>
                  <nz-form-control>
                    <input
                      nz-input
                      [(ngModel)]="platformDesc"
                      name="platformDesc"
                      placeholder="输入平台描述"
                      [disabled]="!platformEditable()"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>默认语言</nz-form-label>
                  <nz-form-control>
                    <nz-select
                      [(ngModel)]="defaultLanguage"
                      name="defaultLanguage"
                      style="width: 100%"
                      [nzDisabled]="!platformEditable()"
                    >
                      <nz-option nzLabel="简体中文" nzValue="zh-CN" />
                      <nz-option nzLabel="English" nzValue="en-US" />
                      <nz-option nzLabel="日本語" nzValue="ja-JP" />
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>时区</nz-form-label>
                  <nz-form-control>
                    <nz-select
                      [(ngModel)]="timezone"
                      name="timezone"
                      style="width: 100%"
                      [nzDisabled]="!platformEditable()"
                    >
                      <nz-option nzLabel="Asia/Shanghai (UTC+8)" nzValue="Asia/Shanghai" />
                      <nz-option nzLabel="America/New_York (UTC-5)" nzValue="America/New_York" />
                      <nz-option nzLabel="Europe/London (UTC+0)" nzValue="Europe/London" />
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>日期格式</nz-form-label>
                  <nz-form-control>
                    <nz-select
                      [(ngModel)]="dateFormat"
                      name="dateFormat"
                      style="width: 100%"
                      [nzDisabled]="!platformEditable()"
                    >
                      <nz-option nzLabel="YYYY-MM-DD" nzValue="YYYY-MM-DD" />
                      <nz-option nzLabel="DD/MM/YYYY" nzValue="DD/MM/YYYY" />
                      <nz-option nzLabel="MM/DD/YYYY" nzValue="MM/DD/YYYY" />
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>
          </form>
        </div>
      </app-panel-card>

      <app-panel-card title="用户注册">
        <div panel-actions class="settings-actions">
          @if (!registrationEditable()) {
            <button nz-button (click)="startEditRegistration()">编辑</button>
          } @else {
            <button nz-button (click)="cancelRegistration()" [disabled]="registrationSaving()">取消</button>
            <button
              nz-button
              nzType="primary"
              (click)="saveRegistration()"
              [disabled]="!registrationDirty() || registrationSaving()"
            >
              {{ registrationSaving() ? '保存中…' : '保存' }}
            </button>
          }
        </div>

        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">开放注册</div>
              <div class="settings-item__desc">允许用户通过邮箱自主注册账号</div>
            </div>
            <nz-switch
              [(ngModel)]="openRegistration"
              [nzDisabled]="!registrationEditable()"
            />
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">邮箱域名白名单</div>
              <div class="settings-item__desc">仅允许指定域名邮箱注册，多个域名用逗号分隔</div>
            </div>
            <input
              nz-input
              [(ngModel)]="emailWhitelist"
              placeholder="@example.com"
              style="width: 240px"
              [disabled]="!registrationEditable()"
            />
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">新用户默认角色</div>
              <div class="settings-item__desc">新注册用户自动分配的角色</div>
            </div>
            <nz-select
              [(ngModel)]="defaultRole"
              style="width: 160px"
              [nzDisabled]="!registrationEditable()"
            >
              <nz-option nzLabel="访客" nzValue="guest" />
              <nz-option nzLabel="开发者" nzValue="developer" />
              <nz-option nzLabel="项目经理" nzValue="manager" />
            </nz-select>
          </div>

          <div class="settings-item">
            <div class="settings-item__info">
              <div class="settings-item__name">注册审批</div>
              <div class="settings-item__desc">新用户注册后需要管理员审批才能激活</div>
            </div>
            <nz-switch
              [(ngModel)]="requireApproval"
              [nzDisabled]="!registrationEditable()"
            />
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

    .settings-form {
      padding: 24px;
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
export class GeneralSettingsComponent {
  private readonly message = inject(NzMessageService);

  readonly platformEditable = signal(false);
  readonly platformDirty = signal(false);
  readonly platformSaving = signal(false);

  readonly registrationEditable = signal(false);
  readonly registrationDirty = signal(false);
  readonly registrationSaving = signal(false);

  readonly platformName = signal('Hub v2 — 内网协作平台');
  readonly platformDesc = signal('企业级内网协作与项目管理平台');
  readonly defaultLanguage = signal('zh-CN');
  readonly timezone = signal('Asia/Shanghai');
  readonly dateFormat = signal('YYYY-MM-DD');

  readonly openRegistration = signal(false);
  readonly emailWhitelist = signal('@hub.com, @xiaomi.com');
  readonly defaultRole = signal('developer');
  readonly requireApproval = signal(true);

  private savedPlatform: PlatformInfo = this.getPlatformSnapshot();
  private savedRegistration: RegistrationSettings = this.getRegistrationSnapshot();

  private getPlatformSnapshot(): PlatformInfo {
    return {
      platformName: this.platformName(),
      platformDesc: this.platformDesc(),
      defaultLanguage: this.defaultLanguage(),
      timezone: this.timezone(),
      dateFormat: this.dateFormat(),
    };
  }

  private getRegistrationSnapshot(): RegistrationSettings {
    return {
      openRegistration: this.openRegistration(),
      emailWhitelist: this.emailWhitelist(),
      defaultRole: this.defaultRole(),
      requireApproval: this.requireApproval(),
    };
  }

  startEditPlatform(): void {
    this.savedPlatform = this.getPlatformSnapshot();
    this.platformEditable.set(true);
    this.platformDirty.set(false);
  }

  cancelPlatform(): void {
    this.platformName.set(this.savedPlatform.platformName);
    this.platformDesc.set(this.savedPlatform.platformDesc);
    this.defaultLanguage.set(this.savedPlatform.defaultLanguage);
    this.timezone.set(this.savedPlatform.timezone);
    this.dateFormat.set(this.savedPlatform.dateFormat);
    this.platformEditable.set(false);
    this.platformDirty.set(false);
  }

  savePlatform(): void {
    this.platformSaving.set(true);
    setTimeout(() => {
      this.savedPlatform = this.getPlatformSnapshot();
      this.platformSaving.set(false);
      this.platformEditable.set(false);
      this.platformDirty.set(false);
      this.message.success('平台信息已保存');
    }, 500);
  }

  startEditRegistration(): void {
    this.savedRegistration = this.getRegistrationSnapshot();
    this.registrationEditable.set(true);
    this.registrationDirty.set(false);
  }

  cancelRegistration(): void {
    this.openRegistration.set(this.savedRegistration.openRegistration);
    this.emailWhitelist.set(this.savedRegistration.emailWhitelist);
    this.defaultRole.set(this.savedRegistration.defaultRole);
    this.requireApproval.set(this.savedRegistration.requireApproval);
    this.registrationEditable.set(false);
    this.registrationDirty.set(false);
  }

  saveRegistration(): void {
    this.registrationSaving.set(true);
    setTimeout(() => {
      this.savedRegistration = this.getRegistrationSnapshot();
      this.registrationSaving.set(false);
      this.registrationEditable.set(false);
      this.registrationDirty.set(false);
      this.message.success('注册设置已保存');
    }, 500);
  }

  checkPlatformDirty(): void {
    const current = this.getPlatformSnapshot();
    this.platformDirty.set(
      current.platformName !== this.savedPlatform.platformName ||
      current.platformDesc !== this.savedPlatform.platformDesc ||
      current.defaultLanguage !== this.savedPlatform.defaultLanguage ||
      current.timezone !== this.savedPlatform.timezone ||
      current.dateFormat !== this.savedPlatform.dateFormat
    );
  }

  checkRegistrationDirty(): void {
    const current = this.getRegistrationSnapshot();
    this.registrationDirty.set(
      current.openRegistration !== this.savedRegistration.openRegistration ||
      current.emailWhitelist !== this.savedRegistration.emailWhitelist ||
      current.defaultRole !== this.savedRegistration.defaultRole ||
      current.requireApproval !== this.savedRegistration.requireApproval
    );
  }
}
