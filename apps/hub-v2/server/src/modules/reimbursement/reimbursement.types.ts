import type { PageResult } from "../../shared/http/pagination";

export type ReimbursementClaimType = "travel" | "general";
export type ReimbursementClaimStatus = "draft" | "submitted" | "approving" | "rejected" | "completed" | "cancelled";
export type ReimbursementItemType = "travel" | "general";
export type ReimbursementAttachmentCategory = "invoice" | "itinerary" | "payment_proof" | "other";
export type ReimbursementTaskStatus = "pending" | "approved" | "rejected" | "transferred" | "addsign_pending" | "cancelled";
export type ReimbursementApprovalPreviewNodeStatus = "approved" | "current" | "pending" | "rejected" | "cancelled";
export type ReimbursementLogAction =
  | "create"
  | "update"
  | "submit"
  | "approve"
  | "reject"
  | "transfer"
  | "add_sign"
  | "attachment.added"
  | "attachment.removed";

export interface TravelReimbursementItemMeta {
  days: number | null;
  airfareAmount: number;
  carriageAmount: number;
  localTransportAmount: number;
  lodgingAmount: number;
  mealAllowanceAmount: number;
  mealAmount: number;
  otherAmount: number;
}

export interface ReimbursementClaimEntity {
  id: string;
  claimNo: string;
  claimType: ReimbursementClaimType;
  status: ReimbursementClaimStatus;
  applicantUserId: string;
  applicantName: string;
  departmentId: string;
  departmentName: string;
  reason: string;
  fillDate: string;
  travelStartDate: string | null;
  travelStartHalf: "am" | "pm" | null;
  travelEndDate: string | null;
  travelEndHalf: "am" | "pm" | null;
  travelDays: number | null;
  receiptCount: number | null;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  currentStageCode: string | null;
  currentStageName: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementItemEntity {
  id: string;
  claimId: string;
  itemType: ReimbursementItemType;
  category: string | null;
  description: string | null;
  occurredDate: string | null;
  startDate: string | null;
  endDate: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  amount: number;
  meta: TravelReimbursementItemMeta | null;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementAttachmentEntity {
  id: string;
  claimId: string;
  uploadId: string;
  category: ReimbursementAttachmentCategory;
  fileName: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface ReimbursementApprovalTaskEntity {
  id: string;
  claimId: string;
  templateId: string;
  templateStageId: string | null;
  stageCode: string;
  stageName: string;
  stageType: string;
  resolverType: string;
  resolverRef: string | null;
  assigneeUserId: string;
  assigneeName: string;
  status: ReimbursementTaskStatus;
  sort: number;
  parentTaskId: string | null;
  transferredFromTaskId: string | null;
  comment: string | null;
  actedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementLogEntity {
  id: string;
  claimId: string;
  actorUserId: string | null;
  actorName: string | null;
  action: ReimbursementLogAction;
  taskId: string | null;
  comment: string | null;
  createdAt: string;
}

export interface ReimbursementApprovalPreviewNode {
  stageCode: string;
  stageName: string;
  status: ReimbursementApprovalPreviewNodeStatus;
  assignees: Array<{ userId: string; name: string }>;
}

export interface ReimbursementApprovalPreview {
  claimId: string;
  claimStatus: ReimbursementClaimStatus;
  currentStageCode: string | null;
  currentStageName: string | null;
  nodes: ReimbursementApprovalPreviewNode[];
}

export interface ReimbursementClaimDetail extends ReimbursementClaimEntity {
  applicantTitleCode: string | null;
  applicantTitleName: string | null;
  items: ReimbursementItemEntity[];
  attachments: ReimbursementAttachmentEntity[];
  tasks: ReimbursementApprovalTaskEntity[];
  logs: ReimbursementLogEntity[];
  approvalPreview: ReimbursementApprovalPreview;
}

export interface ReimbursementItemInput {
  itemType?: ReimbursementItemType;
  category?: string | null;
  description?: string | null;
  occurredDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  amount?: number;
  meta?: Record<string, unknown> | null;
  sort?: number;
}

export interface CreateReimbursementClaimInput {
  claimType: ReimbursementClaimType;
  departmentId?: string;
  reason: string;
  fillDate?: string;
  travelStartDate?: string | null;
  travelStartHalf?: "am" | "pm" | null;
  travelEndDate?: string | null;
  travelEndHalf?: "am" | "pm" | null;
  travelDays?: number | null;
  receiptCount?: number | null;
  advanceAmount?: number;
  items?: ReimbursementItemInput[];
  attachments?: AttachReimbursementUploadInput[];
}

export interface UpdateReimbursementClaimInput {
  departmentId?: string;
  reason?: string;
  fillDate?: string;
  travelStartDate?: string | null;
  travelStartHalf?: "am" | "pm" | null;
  travelEndDate?: string | null;
  travelEndHalf?: "am" | "pm" | null;
  travelDays?: number | null;
  receiptCount?: number | null;
  advanceAmount?: number;
  items?: ReimbursementItemInput[];
}

export interface ReimbursementActionInput {
  taskId: string;
  comment?: string | null;
}

export interface ReimbursementTransferInput extends ReimbursementActionInput {
  targetUserId: string;
}

export interface AttachReimbursementUploadInput {
  uploadId: string;
  category: ReimbursementAttachmentCategory;
}

export interface ListReimbursementClaimsQuery {
  page?: number;
  pageSize?: number;
  scope?: "my" | "all" | "todo";
  claimType?: ReimbursementClaimType | "";
  status?: ReimbursementClaimStatus | "";
  departmentId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReimbursementStatsQuery {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  claimType?: ReimbursementClaimType | "";
}

export interface ReimbursementDashboard {
  todoCount: number;
  myApprovingCount: number;
  completedThisMonthAmount: number;
  recentTodos: ReimbursementClaimEntity[];
  recentClaims: ReimbursementClaimEntity[];
}

export interface ReimbursementStats {
  byMonth: Array<{ month: string; totalAmount: number; count: number }>;
  byType: Array<{ claimType: ReimbursementClaimType; totalAmount: number; count: number }>;
  byDepartment: Array<{ departmentId: string; departmentName: string; totalAmount: number; count: number }>;
  byStatus: Array<{ status: ReimbursementClaimStatus; totalAmount: number; count: number }>;
}

export interface ReimbursementExportFile {
  fileName: string;
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  buffer: Buffer;
  templateType: "0" | "1" | "2";
}

export type ReimbursementClaimListResult = PageResult<ReimbursementClaimEntity>;

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeTravelItemMeta(value: unknown): TravelReimbursementItemMeta {
  const record = toObjectRecord(value) ?? {};
  return {
    days: toNullableFiniteNumber(record["days"]),
    airfareAmount: toFiniteNumber(record["airfareAmount"] ?? record["air"]),
    carriageAmount: toFiniteNumber(record["carriageAmount"] ?? record["ship"]),
    localTransportAmount: toFiniteNumber(record["localTransportAmount"] ?? record["taxi"]),
    lodgingAmount: toFiniteNumber(record["lodgingAmount"] ?? record["hotel"]),
    mealAllowanceAmount: toFiniteNumber(record["mealAllowanceAmount"] ?? record["travel"]),
    mealAmount: toFiniteNumber(record["mealAmount"] ?? record["meals"]),
    otherAmount: toFiniteNumber(record["otherAmount"] ?? record["other"])
  };
}
