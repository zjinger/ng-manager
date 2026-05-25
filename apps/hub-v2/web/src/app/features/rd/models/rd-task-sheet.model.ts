import type { PageResult } from '@core/types';

export type RdTaskSheetStatus = 'draft' | 'issued' | 'processing' | 'replied' | 'closed';
export type RdTaskSheetUrgency = 'normal' | 'urgent';
export type RdTaskSheetBusinessType = 'development' | 'after_sales' | 'consulting' | 'technical_service' | 'other';
export type RdTaskSheetResult = 'resolved' | 'unresolved';
export type RdTaskSheetAction =
  | 'create'
  | 'update'
  | 'issue'
  | 'start_processing'
  | 'reply'
  | 'close'
  | 'attachment.added'
  | 'attachment.removed';

export interface RdTaskSheetEntity {
  id: string;
  projectId: string | null;
  sheetNo: string;
  status: RdTaskSheetStatus;
  title: string;
  issueDate: string;
  issuerDepartment: string | null;
  issuerUserId: string | null;
  issuerName: string;
  receiverDepartment: string | null;
  receiverUserId: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  processorUserId: string | null;
  processorName: string | null;
  customerCompany: string | null;
  customerContact: string | null;
  customerPhone: string | null;
  projectName: string | null;
  projectContact: string | null;
  relatedSystem: string | null;
  urgency: RdTaskSheetUrgency;
  businessType: RdTaskSheetBusinessType;
  expectedResolvedAt: string | null;
  resolvedAt: string | null;
  result: RdTaskSheetResult | null;
  businessDescription: string;
  deliveryContent: string | null;
  closeReason: string | null;
  creatorId: string;
  creatorName: string;
  issuedAt: string | null;
  processingStartedAt: string | null;
  repliedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdTaskSheetAttachmentEntity {
  id: string;
  sheetId: string;
  uploadId: string;
  fileName: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface RdTaskSheetLogEntity {
  id: string;
  sheetId: string;
  action: RdTaskSheetAction;
  actorUserId: string | null;
  actorName: string | null;
  comment: string | null;
  metaJson: string | null;
  createdAt: string;
}

export interface RdTaskSheetDetail extends RdTaskSheetEntity {
  attachments: RdTaskSheetAttachmentEntity[];
  logs: RdTaskSheetLogEntity[];
}

export interface RdTaskSheetListQuery {
  page: number;
  pageSize: number;
  projectId?: string;
  unlinked?: boolean;
  status?: RdTaskSheetStatus[];
  issuerUserId?: string;
  receiverUserId?: string;
  processorUserId?: string;
  keyword?: string;
}

export type RdTaskSheetListResult = PageResult<RdTaskSheetEntity>;

export interface CreateRdTaskSheetInput {
  projectId?: string | null;
  sheetNo?: string | null;
  title: string;
  issueDate?: string;
  issuerDepartment?: string | null;
  issuerUserId?: string | null;
  issuerName?: string | null;
  receiverDepartment?: string | null;
  receiverUserId?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  processorUserId?: string | null;
  customerCompany?: string | null;
  customerContact?: string | null;
  customerPhone?: string | null;
  projectName?: string | null;
  projectContact?: string | null;
  relatedSystem?: string | null;
  urgency?: RdTaskSheetUrgency;
  businessType?: RdTaskSheetBusinessType;
  expectedResolvedAt?: string | null;
  businessDescription: string;
  attachments?: Array<{ uploadId: string }>;
}

export type UpdateRdTaskSheetInput = Partial<CreateRdTaskSheetInput>;

export interface ReplyRdTaskSheetInput {
  result: RdTaskSheetResult;
  resolvedAt?: string | null;
  deliveryContent: string;
}

export interface CloseRdTaskSheetInput {
  reason?: string | null;
}

export const RD_TASK_SHEET_STATUS_LABELS: Record<RdTaskSheetStatus, string> = {
  draft: '草稿',
  issued: '已下发',
  processing: '处理中',
  replied: '已回复',
  closed: '已关闭',
};

export const RD_TASK_SHEET_STATUS_OPTIONS: Array<{ label: string; value: RdTaskSheetStatus }> = [
  { label: '草稿', value: 'draft' },
  { label: '已下发', value: 'issued' },
  { label: '处理中', value: 'processing' },
  { label: '已回复', value: 'replied' },
  { label: '已关闭', value: 'closed' },
];

export const RD_TASK_SHEET_URGENCY_LABELS: Record<RdTaskSheetUrgency, string> = {
  normal: '一般',
  urgent: '紧急',
};

export const RD_TASK_SHEET_BUSINESS_TYPE_LABELS: Record<RdTaskSheetBusinessType, string> = {
  development: '研发',
  after_sales: '售后',
  consulting: '咨询',
  technical_service: '技术服务',
  other: '其他',
};

export const RD_TASK_SHEET_BUSINESS_TYPE_OPTIONS: Array<{ label: string; value: RdTaskSheetBusinessType }> = [
  { label: '研发', value: 'development' },
  { label: '售后', value: 'after_sales' },
  { label: '咨询', value: 'consulting' },
  { label: '技术服务', value: 'technical_service' },
  { label: '其他', value: 'other' },
];

export const RD_TASK_SHEET_RESULT_LABELS: Record<RdTaskSheetResult, string> = {
  resolved: '已解决',
  unresolved: '未解决',
};
