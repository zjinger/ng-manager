import type { PageResult } from "../../shared/http/pagination";

export type RdTaskSheetStatus = "draft" | "issued" | "processing" | "replied" | "closed";
export type RdTaskSheetUrgency = "normal" | "urgent";
export type RdTaskSheetBusinessType = "development" | "after_sales" | "consulting" | "technical_service" | "other";
export type RdTaskSheetResult = "resolved" | "unresolved";
export type RdTaskSheetAction =
  | "create"
  | "update"
  | "issue"
  | "start_processing"
  | "reply"
  | "close"
  | "attachment.added"
  | "attachment.removed";

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

export interface ListRdTaskSheetsQuery {
  page?: number;
  pageSize?: number;
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
  attachments?: AttachRdTaskSheetUploadInput[];
}

export interface UpdateRdTaskSheetInput {
  projectId?: string | null;
  sheetNo?: string | null;
  title?: string;
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
  businessDescription?: string;
}

export interface ReplyRdTaskSheetInput {
  result: RdTaskSheetResult;
  resolvedAt?: string | null;
  deliveryContent: string;
}

export interface CloseRdTaskSheetInput {
  reason?: string | null;
}

export interface AttachRdTaskSheetUploadInput {
  uploadId: string;
}

export interface UserDisplayProfile {
  id: string;
  username: string;
  displayName: string | null;
}
