import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ISSUE_PRIORITY_LABELS } from '../../constants/priority-options';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  template: `<span class="priority-badge" [attr.data-priority]="priority()">{{ text() }}</span>`,
  styles: [
    `
      .priority-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid transparent;
        background: var(--bg-subtle);
        color: var(--text-muted);
      }
      .priority-badge[data-priority='high'] {
        background: rgba(239, 68, 68, 0.14);
        color: #dc2626;
      }
      .priority-badge[data-priority='critical'] {
        background: rgba(245, 158, 11, 0.18);
        color: #d97706;
      }
      .priority-badge[data-priority='medium'] {
        background: rgba(79, 70, 229, 0.14);
        color: var(--primary-600);
      }
      .priority-badge[data-priority='low'] {
        background: rgba(34, 197, 94, 0.14);
        color: #16a34a;
      }
      :host-context(html[data-theme='dark']) .priority-badge {
        border-color: rgba(148, 163, 184, 0.16);
      }
      :host-context(html[data-theme='dark']) .priority-badge[data-priority='high'] {
        background: rgba(239, 68, 68, 0.22);
        color: #fca5a5;
      }
      :host-context(html[data-theme='dark']) .priority-badge[data-priority='critical'] {
        background: rgba(245, 158, 11, 0.24);
        color: #fcd34d;
      }
      :host-context(html[data-theme='dark']) .priority-badge[data-priority='medium'] {
        background: rgba(99, 102, 241, 0.22);
        color: #c7d2fe;
      }
      :host-context(html[data-theme='dark']) .priority-badge[data-priority='low'] {
        background: rgba(34, 197, 94, 0.22);
        color: #86efac;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityBadgeComponent {
  readonly priority = input.required<string>();
  readonly label = input<string>('');
  readonly text = computed(() => this.label() || ISSUE_PRIORITY_LABELS[this.priority()] || this.priority());
}
