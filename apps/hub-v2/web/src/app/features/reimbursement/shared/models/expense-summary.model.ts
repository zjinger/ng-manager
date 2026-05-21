import type { ReimbursementAttachmentEntity } from '@app/features/reimbursement/models/reimbursement.model';

/** 报销表单金额汇总与附件状态。 */
export interface ExpenseSummary {
  totalAmount: number;
  advanceAmount: number;
  differenceAmount: number;
  attachments: ReimbursementAttachmentEntity[];
}
