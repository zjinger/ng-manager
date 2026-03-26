import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { PanelCardComponent } from '@shared/ui';

@Component({
  selector: 'app-profile-security-overview',
  standalone: true,
  imports: [NzButtonModule, PanelCardComponent],
  template: `
    <section class="profile-stack">
      <app-panel-card title="两步验证 (2FA)">
        <div class="security-list">
          @for (item of methods(); track item.title) {
            <div class="security-item">
              <div class="security-item__icon">{{ item.icon }}</div>
              <div class="security-item__body">
                <div class="security-item__title">{{ item.title }}</div>
                <div class="security-item__desc">{{ item.description }}</div>
              </div>
              @if (item.active) {
                <span class="security-item__badge active">已开启</span>
              } @else {
                <button nz-button type="button" nzSize="small">启用</button>
              }
            </div>
          }
        </div>
      </app-panel-card>

      <app-panel-card title="活跃会话">
        <div class="session-list">
          @for (session of sessions(); track session.name) {
            <div class="session-item" [class.current]="session.current">
              <div class="session-item__icon">{{ session.icon }}</div>
              <div class="session-item__body">
                <div class="session-item__name">
                  {{ session.name }}
                  @if (session.current) {
                    <span class="session-item__current">当前</span>
                  }
                </div>
                <div class="session-item__meta">{{ session.meta }}</div>
              </div>
              @if (!session.current) {
                <button nz-button type="button" nzDanger nzSize="small">终止</button>
              }
            </div>
          }
        </div>
      </app-panel-card>
    </section>
  `,
  styles: [
    `
      .profile-stack,
      .security-list,
      .session-list {
        display: grid;
        gap: 20px;
      }

      .security-list,
      .session-list {
        gap: 0;
      }

      .security-item,
      .session-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
        border-top: 1px solid var(--border-color-soft);
        transition: background-color 0.2s ease;
      }

      .security-item:first-child,
      .session-item:first-child {
        border-top: none;
      }

      .security-item__icon,
      .session-item__icon {
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

      .security-item__body,
      .session-item__body {
        flex: 1;
        min-width: 0;
      }

      .security-item__title,
      .session-item__name {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }

      .security-item__desc,
      .session-item__meta {
        margin-top: 4px;
        color: var(--text-muted);
        font-size: 12px;
      }

      .security-item__badge {
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .security-item__badge.active {
        background: rgba(16, 185, 129, 0.14);
        color: var(--color-success);
      }

      .security-item:hover,
      .session-item:hover {
        background: color-mix(in srgb, var(--bg-subtle) 72%, transparent);
      }

      .session-item.current {
        background: color-mix(in srgb, var(--bg-subtle) 70%, transparent);
      }

      .session-item__current {
        margin-left: 8px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.14);
        color: var(--color-success);
        font-size: 11px;
        font-weight: 700;
      }

      :host-context(html[data-theme='dark']) .session-item.current {
        background: rgba(148, 163, 184, 0.08);
      }

      :host-context(html[data-theme='dark']) .security-item:hover,
      :host-context(html[data-theme='dark']) .session-item:hover {
        background: rgba(148, 163, 184, 0.08);
      }

      @media (max-width: 768px) {
        .security-item,
        .session-item {
          align-items: flex-start;
          flex-wrap: wrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSecurityOverviewComponent {
  readonly methods = input.required<{ icon: string; title: string; description: string; active: boolean }[]>();
  readonly sessions = input.required<{ icon: string; name: string; meta: string; current: boolean }[]>();
}
