import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PanelCardComponent } from '@shared/ui/panel-card';
import { SystemSettingsApiService, type NotificationSettings } from '../../services/system-settings-api.service';

@Component({
  selector: 'app-notification-settings',
  imports: [FormsModule, NzSwitchModule, NzButtonModule, NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card title="通知渠道">
      <div panel-actions class="settings-actions">
        @if (!editable()) {
          <button nz-button (click)="startEdit()">编辑</button>
        } @else {
          <button nz-button (click)="cancel()" [disabled]="saving()">取消</button>
          <button
            nz-button
            nzType="primary"
            (click)="save()"
            [disabled]="!dirty() || saving()"
          >
            {{ saving() ? '保存中…' : '保存' }}
          </button>
        }
      </div>

      <div class="settings-list">
        <div class="settings-item">
          <div class="settings-item__info">
            <div class="settings-item__name">邮件通知</div>
            <div class="settings-item__desc">通过 SMTP 发送邮件通知</div>
          </div>
          <nz-switch
            [(ngModel)]="emailEnabled"
            [nzDisabled]="!editable()"
          />
        </div>

        <div class="settings-item">
          <div class="settings-item__info">
            <div class="settings-item__name">企业微信推送</div>
            <div class="settings-item__desc">通过企业微信 Webhook 推送通知</div>
          </div>
          <nz-switch
            [(ngModel)]="wechatWorkEnabled"
            [nzDisabled]="!editable()"
          />
        </div>

        <div class="settings-item">
          <div class="settings-item__info">
            <div class="settings-item__name">飞书推送</div>
            <div class="settings-item__desc">通过飞书机器人推送通知</div>
          </div>
          <nz-switch
            [(ngModel)]="feishuEnabled"
            [nzDisabled]="!editable()"
          />
        </div>

        <div class="settings-item">
          <div class="settings-item__info">
            <div class="settings-item__name">钉钉推送</div>
            <div class="settings-item__desc">通过钉钉机器人推送通知</div>
          </div>
          <nz-switch
            [(ngModel)]="dingtalkEnabled"
            [nzDisabled]="!editable()"
          />
        </div>

        <div class="settings-item">
          <div class="settings-item__info">
            <div class="settings-item__name">浏览器推送</div>
            <div class="settings-item__desc">通过 Web Push API 发送浏览器通知</div>
          </div>
          <nz-switch
            [(ngModel)]="browserPushEnabled"
            [nzDisabled]="!editable()"
          />
        </div>
      </div>
    </app-panel-card>
  `,
  styles: `
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
export class NotificationSettingsComponent implements OnInit {
  private readonly message = inject(NzMessageService);
  private readonly settingsApi = inject(SystemSettingsApiService);

  readonly editable = signal(false);
  readonly dirty = signal(false);
  readonly saving = signal(false);

  readonly emailEnabled = signal(true);
  readonly wechatWorkEnabled = signal(true);
  readonly feishuEnabled = signal(false);
  readonly dingtalkEnabled = signal(false);
  readonly browserPushEnabled = signal(true);

  private savedState: NotificationSettings = this.getSnapshot();

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.settingsApi.getNotificationSettings().subscribe({
      next: (settings) => {
        this.emailEnabled.set(settings.emailEnabled);
        this.wechatWorkEnabled.set(settings.wechatWorkEnabled);
        this.feishuEnabled.set(settings.feishuEnabled);
        this.dingtalkEnabled.set(settings.dingtalkEnabled);
        this.browserPushEnabled.set(settings.browserPushEnabled);
        this.savedState = this.getSnapshot();
      },
      error: () => {
        this.message.error('加载设置失败');
      }
    });
  }

  private getSnapshot(): NotificationSettings {
    return {
      emailEnabled: this.emailEnabled(),
      wechatWorkEnabled: this.wechatWorkEnabled(),
      feishuEnabled: this.feishuEnabled(),
      dingtalkEnabled: this.dingtalkEnabled(),
      browserPushEnabled: this.browserPushEnabled(),
    };
  }

  startEdit(): void {
    this.savedState = this.getSnapshot();
    this.editable.set(true);
    this.dirty.set(false);
  }

  cancel(): void {
    this.emailEnabled.set(this.savedState.emailEnabled);
    this.wechatWorkEnabled.set(this.savedState.wechatWorkEnabled);
    this.feishuEnabled.set(this.savedState.feishuEnabled);
    this.dingtalkEnabled.set(this.savedState.dingtalkEnabled);
    this.browserPushEnabled.set(this.savedState.browserPushEnabled);
    this.editable.set(false);
    this.dirty.set(false);
  }

  save(): void {
    this.saving.set(true);
    const data = this.getSnapshot();
    this.settingsApi.updateNotificationSettings(data).subscribe({
      next: () => {
        this.savedState = this.getSnapshot();
        this.saving.set(false);
        this.editable.set(false);
        this.dirty.set(false);
        this.message.success('通知设置已保存');
      },
      error: () => {
        this.saving.set(false);
        this.message.error('保存失败');
      }
    });
  }

  checkDirty(): void {
    const current = this.getSnapshot();
    this.dirty.set(
      current.emailEnabled !== this.savedState.emailEnabled ||
      current.wechatWorkEnabled !== this.savedState.wechatWorkEnabled ||
      current.feishuEnabled !== this.savedState.feishuEnabled ||
      current.dingtalkEnabled !== this.savedState.dingtalkEnabled ||
      current.browserPushEnabled !== this.savedState.browserPushEnabled
    );
  }
}
