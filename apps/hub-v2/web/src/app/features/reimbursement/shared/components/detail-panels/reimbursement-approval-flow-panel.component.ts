import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ReimbursementApprovalPreview } from '@app/features/reimbursement/models/reimbursement.model';
import { PanelCardComponent } from '@app/shared/ui';
import { ApprovalFlowComponent } from '../approval-flow/approval-flow.component';

@Component({
  selector: 'app-reimbursement-approval-flow-panel',
  standalone: true,
  imports: [ApprovalFlowComponent, PanelCardComponent],
  template: `
    <app-panel-card title="审批流程">
      <div class="flow-body">
        <app-approval-flow [approvalPreview]="approvalPreview()" />
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .flow-body {
        padding: 16px 20px 20px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementApprovalFlowPanelComponent {
  readonly approvalPreview = input<ReimbursementApprovalPreview | null>(null);
}
