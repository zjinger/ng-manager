import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="status-badge" [attr.data-status]="status()">{{ label() || status() }}</span>`,
  styles: [
    `
      .status-badge {
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
      .status-badge[data-status='resolved'],
      .status-badge[data-status='done'],
      .status-badge[data-status='published'] {
        background: rgba(34, 197, 94, 0.14);
        color: #16a34a;
      }
      .status-badge[data-status='open'],
      .status-badge[data-status='doing'] {
        background: rgba(79, 70, 229, 0.14);
        color: var(--primary-600);
      }
      .status-badge[data-status='blocked'] {
        background: rgba(239, 68, 68, 0.14);
        color: #dc2626;
      }
      .status-badge[data-status='verified'] {
        background: rgba(14, 165, 233, 0.14);
        color: #0284c7;
      }
      .status-badge[data-status='closed'],
      .status-badge[data-status='canceled'] {
        background: rgba(148, 163, 184, 0.18);
        color: var(--text-muted);
      }
      :host-context(html[data-theme='dark']) .status-badge {
        border-color: rgba(148, 163, 184, 0.16);
      }
      :host-context(html[data-theme='dark']) .status-badge[data-status='resolved'],
      :host-context(html[data-theme='dark']) .status-badge[data-status='done'],
      :host-context(html[data-theme='dark']) .status-badge[data-status='published'] {
        background: rgba(34, 197, 94, 0.22);
        color: #86efac;
      }
      :host-context(html[data-theme='dark']) .status-badge[data-status='open'],
      :host-context(html[data-theme='dark']) .status-badge[data-status='doing'] {
        background: rgba(99, 102, 241, 0.22);
        color: #c7d2fe;
      }
      :host-context(html[data-theme='dark']) .status-badge[data-status='blocked'] {
        background: rgba(239, 68, 68, 0.22);
        color: #fca5a5;
      }
      :host-context(html[data-theme='dark']) .status-badge[data-status='verified'] {
        background: rgba(14, 165, 233, 0.22);
        color: #7dd3fc;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string>('');
}
