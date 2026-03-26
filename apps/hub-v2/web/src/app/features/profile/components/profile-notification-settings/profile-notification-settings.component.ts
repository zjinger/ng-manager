import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { PanelCardComponent } from '@shared/ui';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface ProfileNotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon?: string;
}

@Component({
  selector: 'app-profile-notification-settings',
  standalone: true,
  imports: [FormsModule, NzCheckboxModule, NzIconModule, PanelCardComponent],
  template: `
    <section class="profile-stack">
      <app-panel-card title="通知渠道">
        <div class="preference-list">
          @for (item of channels(); track item.id) {
            <label class="preference-item">
              <div class="preference-item__icon channel">
                <nz-icon [nzType]="item.icon || 'bell'" nzTheme="outline"></nz-icon>
              </div>
              <div class="preference-item__body">
                <div class="preference-item__title">{{ item.title }}</div>
                <div class="preference-item__desc">{{ item.description }}</div>
              </div>
              <label nz-checkbox [ngModel]="item.enabled" (ngModelChange)="toggle.emit({ group: 'channel', id: item.id, enabled: $event })"></label>
            </label>
          }
        </div>
      </app-panel-card>

      <app-panel-card title="事件订阅">
        <div class="preference-list">
          @for (item of events(); track item.id) {
            <label class="preference-item">
              <div class="preference-item__icon">
                <nz-icon [nzType]="item.icon || 'notification'" nzTheme="outline"></nz-icon>
              </div>
              <div class="preference-item__body">
                <div class="preference-item__title">{{ item.title }}</div>
                <div class="preference-item__desc">{{ item.description }}</div>
              </div>
              <label nz-checkbox [ngModel]="item.enabled" (ngModelChange)="toggle.emit({ group: 'event', id: item.id, enabled: $event })"></label>
            </label>
          }
        </div>
      </app-panel-card>
    </section>
  `,
  styles: [
    `
      .profile-stack,
      .preference-list {
        display: grid;
        gap: 20px;
      }

      .preference-list {
        gap: 0;
      }

      .preference-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
        border-top: 1px solid var(--border-color-soft);
        transition: background-color 0.2s ease;
      }

      .preference-item:first-child {
        border-top: none;
      }

      .preference-item:hover {
        background: color-mix(in srgb, var(--bg-subtle) 72%, transparent);
      }

      .preference-item__icon {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: var(--bg-subtle);
        color: var(--color-primary);
        font-size: 17px;
        flex-shrink: 0;
      }

      .preference-item__icon.channel {
        background: color-mix(in srgb, var(--primary-50) 72%, transparent);
      }

      .preference-item__body {
        flex: 1;
        min-width: 0;
      }

      .preference-item__title {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }

      .preference-item__desc {
        margin-top: 4px;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.7;
      }

      .preference-item > label[nz-checkbox] {
        flex-shrink: 0;
        margin-left: 12px;
        padding-left: 14px;
        border-left: 1px solid var(--border-color-soft);
      }

      :host-context(html[data-theme='dark']) .preference-item:hover {
        background: rgba(148, 163, 184, 0.08);
      }

      @media (max-width: 768px) {
        .preference-item {
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .preference-item > label[nz-checkbox] {
          margin-left: 58px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileNotificationSettingsComponent {
  readonly channels = input.required<ProfileNotificationSetting[]>();
  readonly events = input.required<ProfileNotificationSetting[]>();
  readonly toggle = output<{ group: 'channel' | 'event'; id: string; enabled: boolean }>();
}
