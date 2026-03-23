import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-user-status-tag',
  standalone: true,
  template: `<span class="user-status" [attr.data-status]="status()">{{ statusLabel() }}</span>`,
  styles: [
    `
      .user-status {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid transparent;
        background: var(--bg-subtle);
        color: var(--text-muted);
      }
      .user-status[data-status='active'] {
        background: rgba(34, 197, 94, 0.14);
        color: #16a34a;
      }
      .user-status[data-status='inactive'] {
        background: rgba(239, 68, 68, 0.14);
        color: #dc2626;
      }
      :host-context(html[data-theme='dark']) .user-status {
        border-color: rgba(148, 163, 184, 0.16);
      }
      :host-context(html[data-theme='dark']) .user-status[data-status='active'] {
        background: rgba(34, 197, 94, 0.22);
        color: #86efac;
      }
      :host-context(html[data-theme='dark']) .user-status[data-status='inactive'] {
        background: rgba(239, 68, 68, 0.22);
        color: #fca5a5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserStatusTagComponent {
  readonly status = input.required<'active' | 'inactive'>();

  statusLabel(): string {
    return this.status() === 'active' ? '活跃' : '停用';
  }
}
