import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ReimbursementClaimDetail } from '@app/features/reimbursement/models/reimbursement.model';
import { PanelCardComponent } from '@app/shared/ui';
import {
  reimbursementBalanceAmountLabel,
  reimbursementBalanceDisplayAmount,
} from '../../utils/reimbursement-detail-display.util';

@Component({
  selector: 'app-reimbursement-amount-summary-panel',
  standalone: true,
  imports: [PanelCardComponent],
  template: `
    <app-panel-card title="金额汇总">
      <div class="amount-grid">
        <div class="amount-tile amount-tile--total">
          <span>总金额</span>
          <strong>¥{{ detail().totalAmount.toFixed(2) }}</strong>
        </div>
        <div class="amount-tile amount-tile--advance">
          <span>预支金额</span>
          <strong>¥{{ detail().advanceAmount.toFixed(2) }}</strong>
        </div>
        <div class="amount-tile amount-tile--balance">
          <span>{{ balanceAmountLabel(detail()) }}</span>
          <strong
            [class.positive]="detail().balanceAmount > 0"
            [class.negative]="detail().balanceAmount < 0"
          >
            ¥{{ balanceDisplayAmount(detail()).toFixed(2) }}
          </strong>
        </div>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .amount-grid {
        padding: 16px 20px 20px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .amount-tile {
        min-height: 78px;
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        padding: 14px 16px;
        background: var(--bg-subtle);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
      }

      .amount-tile span {
        color: var(--text-muted);
        font-size: 12px;
      }

      .amount-tile strong {
        color: var(--text-primary);
        font-size: 22px;
        line-height: 1;
      }

      .amount-tile--total {
        border-color: rgba(37, 99, 235, 0.18);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.04));
      }

      .amount-tile--total span,
      .amount-tile--total strong {
        color: #2563eb;
      }

      .amount-tile--advance {
        border-color: rgba(217, 119, 6, 0.2);
        background: linear-gradient(135deg, rgba(217, 119, 6, 0.11), rgba(217, 119, 6, 0.04));
      }

      .amount-tile--advance span,
      .amount-tile--advance strong {
        color: #d97706;
      }

      .amount-tile--balance {
        border-color: rgba(22, 163, 74, 0.2);
        background: linear-gradient(135deg, rgba(22, 163, 74, 0.1), rgba(22, 163, 74, 0.04));
      }

      .amount-tile--balance span,
      .amount-tile--balance strong.positive {
        color: #16a34a;
      }

      .amount-tile--balance strong.negative {
        color: #dc2626;
      }

      @media (max-width: 720px) {
        .amount-grid {
          grid-template-columns: 1fr;
          padding: 14px 16px 18px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementAmountSummaryPanelComponent {
  readonly detail = input.required<ReimbursementClaimDetail>();

  protected readonly balanceAmountLabel = reimbursementBalanceAmountLabel;
  protected readonly balanceDisplayAmount = reimbursementBalanceDisplayAmount;
}
