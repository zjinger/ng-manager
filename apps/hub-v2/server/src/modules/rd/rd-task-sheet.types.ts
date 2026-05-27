import type { PageResult } from "../../shared/http/pagination";

export type RdTaskSheetStatus = "draft" | "pending_review" | "returned" | "issued" | "processing" | "replied" | "closed";
export type RdTaskSheetUrgency = "normal" | "urgent";
export type RdTaskSheetBusinessType = "development" | "after_sales" | "consulting" | "technical_service" | "other";
export type RdTaskSheetResult = "resolved" | "unresolved";
export type RdTaskSheetAction =
  | "create"
  | "update"
  | "submit_review"
  | "review.approve"
  | "review.return"
  | "issue"
  | "assign"
  | "start_processing"
  | "reply"
  | "close"
  | "convert.rd_item"
  | "convert.issue"
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
  convertedRdItemId: string | null;
  convertedIssueId: string | null;
  creatorId: string;
  creatorName: string;
  preparedByName: string | null;
  reviewerUserId: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  assignedAt: string | null;
  assignmentComment: string | null;
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

export type RdTaskSheetDefaultRouteStatus = "active" | "inactive";

export interface RdTaskSheetDefaultRouteEntity {
  id: string;
  issuerUserId: string | null;
  issuerName: string | null;
  issuerDepartment: string | null;
  receiverUserId: string | null;
  receiverName: string | null;
  receiverDepartment: string | null;
  receiverPhone: string | null;
  status: RdTaskSheetDefaultRouteStatus;
  remark: string | null;
  sort: number;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListRdTaskSheetDefaultRoutesQuery {
  keyword?: string;
  status?: RdTaskSheetDefaultRouteStatus | "";
}

export interface CreateRdTaskSheetDefaultRouteInput {
  issuerUserId?: string | null;
  issuerName?: string | null;
  issuerDepartment?: string | null;
  receiverUserId?: string | null;
  receiverName?: string | null;
  receiverDepartment?: string | null;
  receiverPhone?: string | null;
  status?: RdTaskSheetDefaultRouteStatus;
  remark?: string | null;
  sort?: number;
}

export type UpdateRdTaskSheetDefaultRouteInput = Partial<CreateRdTaskSheetDefaultRouteInput>;

export interface ListRdTaskSheetsQuery {
  page?: number;
  pageSize?: number;
  scope?: "related" | "workflow" | "all";
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
  resolvedAt?: string | null;
  result?: RdTaskSheetResult | null;
  businessDescription: string;
  deliveryContent?: string | null;
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

export interface ReturnReviewRdTaskSheetInput {
  comment?: string | null;
}

export interface AssignRdTaskSheetInput {
  projectId?: string | null;
  processorUserId?: string | null;
  processorName?: string | null;
  comment?: string | null;
}

export interface AttachRdTaskSheetUploadInput {
  uploadId: string;
}

export interface PreviewRdTaskSheetImportInput {
  uploadId: string;
}

export interface PreviewRdTaskSheetImportResult {
  draft: CreateRdTaskSheetInput;
  upload: {
    uploadId: string;
    originalName: string;
  };
}

export interface RenderedRdTaskSheetWord {
  fileName: string;
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  buffer: Buffer;
}

export interface ConvertRdTaskSheetToRdItemInput {
  projectId?: string | null;
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  memberIds?: string[];
  verifierId?: string | null;
  planStartAt?: string | null;
  planEndAt?: string | null;
}

export interface ConvertRdTaskSheetToIssueInput {
  projectId?: string | null;
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  assigneeId?: string | null;
  verifierId?: string | null;
  rdItemId?: string | null;
}

export interface UserDisplayProfile {
  id: string;
  username: string;
  displayName: string | null;
}
