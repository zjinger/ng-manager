import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RD_STATUS_LABELS } from '../../constants';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="status-badge" [attr.data-status]="status()">{{ displayLabel() }}</span>`,
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
      .status-badge[data-status='verified'],
      
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
      .status-badge[data-status='resolved']
       {
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

  displayLabel(): string {
    const custom = this.label();
    if (custom) {
      return custom;
    }
    return STATUS_TEXT_MAP[this.status()] ?? this.status();
  }
}

const STATUS_TEXT_MAP: Record<string, string> = {
  active: '启用',
  inactive: '停用',
  open: '待处理',
  in_progress: '处理中',
  reopened: '已重开',
  resolved: '待验证',
  verified: '已验证',
  closed: '已关闭',
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
  canceled: '已取消',
  ...RD_STATUS_LABELS,
};
