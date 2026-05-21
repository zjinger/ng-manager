import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ReimbursementClaimType } from '@app/features/reimbursement/models/reimbursement.model';

@Component({
  selector: 'app-reimbursement-type-tag',
  standalone: true,
  template: `
    <span class="reimbursement-type-tag" [attr.data-type]="type() || 'unknown'">
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .reimbursement-type-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        max-width: 100%;
        padding: 2px 8px;
        border: 1px solid rgba(14, 165, 233, 0.28);
        border-radius: 999px;
        background: rgba(14, 165, 233, 0.1);
        color: #0369a1;
        font-size: 11px;
        font-weight: 700;
        line-height: 18px;
        white-space: nowrap;
      }

      .reimbursement-type-tag[data-type='general'] {
        border-color: rgba(20, 184, 166, 0.28);
        background: rgba(20, 184, 166, 0.1);
        color: #0f766e;
      }

      .reimbursement-type-tag[data-type='unknown'] {
        border-color: rgba(148, 163, 184, 0.32);
        background: rgba(148, 163, 184, 0.12);
        color: var(--text-secondary);
      }

      :host-context(html[data-theme='dark']) .reimbursement-type-tag {
        border-color: rgba(56, 189, 248, 0.34);
        background: rgba(56, 189, 248, 0.14);
        color: #7dd3fc;
      }

      :host-context(html[data-theme='dark']) .reimbursement-type-tag[data-type='general'] {
        border-color: rgba(45, 212, 191, 0.34);
        background: rgba(45, 212, 191, 0.14);
        color: #5eead4;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementTypeTagComponent {
  readonly type = input<ReimbursementClaimType | null | undefined>(null);

  readonly label = computed(() => {
    const type = this.type();
    if (type === 'travel') {
      return '差旅费报销';
    }
    if (type === 'general') {
      return '费用报销';
    }
    return '报销单';
  });
}
