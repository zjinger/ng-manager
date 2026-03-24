import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ISSUE_TYPE_LABELS } from '@app/shared/constants';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  template: `<span class="type-badge" [attr.data-type]="type()">{{ displayLabel() }}</span>`,
  styles: [
    `
      .type-badge {
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
      /**
        bug: '缺陷', // #ef4444
        feature: '新功能', // #22c55e
        change: '需求变更', // #f97316
        improvement: '改进', // #eab308
        task: '任务',   // #3b82f6
        test: '测试记录', // #0284c7
       */
      .type-badge[data-type='bug']{
        background: rgba(239, 68, 68, 0.14);
        color: #dc2626;
      }
      .type-badge[data-type='feature']{
        background: rgba(34, 197, 94, 0.14);
        color: #22c55e;
      }
      .type-badge[data-type='change']{
        background: rgba(249, 115, 22, 0.14);
        color: #f97316;
      }
      .type-badge[data-type='improvement']{
        background: rgba(234, 179, 8, 0.14);
        color: #eab308;
      }
      .type-badge[data-type='task']{
        background: rgba(59, 130, 246, 0.14);
        color: #3b82f6;
      }
      .type-badge[data-type='test']{
        background: rgba(2, 132, 199, 0.14);
        color: #0284c7;
      }
      .type-badge[data-type='other']{
        background: rgba(2, 132, 199, 0.14);
        color: #0284c7;
      }
      :host-context(html[data-theme='dark']) .type-badge {
        border-color: rgba(148, 163, 184, 0.16);
      }
      :host-context(html[data-theme='dark']) .type-badge[data-type='bug'] {
        background: rgba(239, 68, 68, 0.22);
        color: #fca5a5;
      }
      :host-context(html[data-theme='dark']) .type-badge[data-type='feature'] {
        background: rgba(34, 197, 94, 0.22);
        color: #22c55e;
      }
      :host-context(html[data-theme='dark']) .type-badge[data-type='change'] {
        background: rgba(249, 115, 22, 0.22);
        color: #f97316;
      }
      :host-context(html[data-theme='dark']) .type-badge[data-type='improvement'] {
        background: rgba(234, 179, 8, 0.22);
        color: #eab308;
      }
      :host-context(html[data-theme='dark']) .type-badge[data-type='task'] {
        background: rgba(59, 130, 246, 0.22);
        color: #3b82f6;
      }
      :host-context(html[data-theme='dark']) .type-badge[data-type='test'] {
        background: rgba(2, 132, 199, 0.22);
        color: #0284c7;
      }
      :host-context(html[data-theme='dark']) .type-badge[data-type='other'] {
        background: rgba(2, 132, 199, 0.22);
        color: #0284c7;
      } 
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeBadgeComponent {
  readonly type = input.required<string>();
  readonly label = input<string>('');

  displayLabel(): string {
    if (this.label()) {
      return this.label();
    }
    return ISSUE_TYPE_LABELS[this.type()] ?? this.type();
  }
}

