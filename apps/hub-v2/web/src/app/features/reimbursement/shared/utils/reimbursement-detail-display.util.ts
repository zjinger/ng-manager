import type {
  CreateReimbursementClaimInput,
  ReimbursementAttachmentEntity,
  ReimbursementClaimDetail,
  ReimbursementItemEntity,
  ReimbursementItemInput,
  TravelReimbursementItemMeta,
} from '@app/features/reimbursement/models/reimbursement.model';
import type { AttachmentPreviewItem, AttachmentPreviewKind } from '@app/shared/ui';
import {
  parseMoneyInput,
  roundMoney,
  travelMetaNumber,
  travelSubtotal,
} from './reimbursement-money.util';

export function reimbursementStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    approving: '审批中',
    rejected: '已驳回',
    completed: '已完成',
    cancelled: '已取消',
  };
  return labelMap[status] || status;
}

export function reimbursementHalfLabel(value: 'am' | 'pm' | null): string {
  if (value === 'am') {
    return '上午';
  }
  if (value === 'pm') {
    return '下午';
  }
  return '';
}

export function reimbursementLocationLabel(item: ReimbursementItemEntity): string {
  if (item.fromLocation || item.toLocation) {
    return `${item.fromLocation || '--'} → ${item.toLocation || '--'}`;
  }
  return '';
}

export function reimbursementTravelMetaNumber(item: ReimbursementItemEntity, key: keyof TravelReimbursementItemMeta): number {
  return travelMetaNumber(item, key);
}

export function reimbursementTravelSubtotal(item: ReimbursementItemEntity): number {
  return travelSubtotal(item);
}

export function reimbursementMoneyCell(value: number | null | undefined): string {
  const numeric = parseMoneyInput(value);
  return numeric === 0 ? '' : numeric.toFixed(2);
}

export function reimbursementNumberCell(value: number | null | undefined): string {
  const numeric = parseMoneyInput(value);
  return numeric === 0 ? '' : String(numeric);
}

export function reimbursementGrandTotalCell(value: number): string {
  const amount = reimbursementMoneyCell(value);
  return amount ? `总计：${amount}` : '';
}

export function reimbursementBalanceAmountLabel(detail: ReimbursementClaimDetail): string {
  return detail.advanceAmount > detail.totalAmount ? '应退金额' : '应补金额';
}

export function reimbursementBalanceDisplayAmount(detail: ReimbursementClaimDetail): number {
  return roundMoney(Math.abs(detail.balanceAmount));
}

export function reimbursementAttachmentKind(mimeType: string | null | undefined): AttachmentPreviewKind {
  if (!mimeType) {
    return 'file';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return 'file';
}

export function reimbursementFormatFileSize(bytes: number | null | undefined): string {
  if (!bytes) {
    return '0 B';
  }
  const unit = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(unit));
  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`;
}

export function mapReimbursementAttachmentToPreviewItem(att: ReimbursementAttachmentEntity): AttachmentPreviewItem {
  return {
    id: String(att.id ?? att.uploadId ?? 'attachment'),
    name: att.originalName || att.fileName || '附件',
    url: `/api/admin/uploads/${att.uploadId}/raw`,
    kind: reimbursementAttachmentKind(att.mimeType),
    meta: reimbursementFormatFileSize(att.fileSize),
    removable: false,
  };
}

export function mapReimbursementItemToInput(item: ReimbursementItemEntity): ReimbursementItemInput {
  return {
    id: item.id,
    itemType: item.itemType,
    category: item.category,
    description: item.description,
    occurredDate: item.occurredDate,
    startDate: item.startDate,
    endDate: item.endDate,
    fromLocation: item.fromLocation,
    toLocation: item.toLocation,
    amount: item.amount,
    meta: item.meta as TravelReimbursementItemMeta | null,
    sort: item.sort,
  };
}

export function mapReimbursementDetailToClaimInput(detail: ReimbursementClaimDetail): CreateReimbursementClaimInput {
  return {
    claimType: detail.claimType,
    departmentId: detail.departmentId,
    departmentName: detail.departmentName,
    applicantName: detail.applicantName,
    titleName: detail.applicantTitleName,
    reason: detail.reason,
    fillDate: detail.fillDate,
    advanceAmount: detail.advanceAmount,
    travelStartDate: detail.travelStartDate,
    travelStartHalf: detail.travelStartHalf,
    travelEndDate: detail.travelEndDate,
    travelEndHalf: detail.travelEndHalf,
    travelDays: detail.travelDays,
    receiptCount: detail.receiptCount,
    items: detail.items.map((item) => mapReimbursementItemToInput(item)),
  };
}
