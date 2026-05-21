import { ChangeDetectionStrategy, Component, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import type { ReimbursementApprovalTaskEntity } from '@app/features/reimbursement/models/reimbursement.model';
import { PanelCardComponent } from '@app/shared/ui';

@Component({
  selector: 'app-reimbursement-approval-action-panel',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzIconModule, NzInputModule, PanelCardComponent],
  template: `
    <app-panel-card title="审批操作">
      <div class="action-body">
        <textarea
          nz-input
          class="approval-comment"
          [ngModel]="comment()"
          (ngModelChange)="comment.set($event)"
          placeholder="请输入审批意见，例如：票据完整，同意报销"
        ></textarea>
        <div class="approval-actions">
          <button nz-button nzType="primary" [nzLoading]="approving()" (click)="approve.emit(task())">
            <span nz-icon nzType="check"></span>
            通过
          </button>
          <button nz-button nzDanger [nzLoading]="rejecting()" (click)="reject.emit(task())">
            <span nz-icon nzType="close"></span>
            驳回
          </button>
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

      .action-body {
        padding: 16px 20px 20px;
      }

      .approval-comment {
        min-height: 92px;
        resize: vertical;
      }

      .approval-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementApprovalActionPanelComponent {
  readonly task = input.required<ReimbursementApprovalTaskEntity>();
  readonly comment = model('');
  readonly approving = input(false);
  readonly rejecting = input(false);
  readonly approve = output<ReimbursementApprovalTaskEntity>();
  readonly reject = output<ReimbursementApprovalTaskEntity>();
}
