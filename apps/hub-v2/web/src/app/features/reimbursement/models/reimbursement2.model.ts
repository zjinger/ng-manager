import type { PageResult } from '@core/types';

export type ReimbursementClaimType = 'travel' | 'general';
export type ReimbursementClaimStatus = 'draft' | 'submitted' | 'approving' | 'rejected' | 'completed' | 'cancelled';
export type ReimbursementItemType = 'travel' | 'general';
export type ReimbursementAttachmentCategory = 'invoice' | 'itinerary' | 'payment_proof' | 'other';
export type ReimbursementTaskStatus = 'pending' | 'approved' | 'rejected' | 'transferred' | 'addsign_pending' | 'cancelled';
export type ReimbursementListScope = 'my' | 'all' | 'todo';
export type ReimbursementApprovalPreviewNodeStatus = 'approved' | 'current' | 'pending' | 'rejected' | 'cancelled';

/** 差旅明细固定 meta 结构。 */
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

/** 通用报销单基础字段。 */
export interface ReimbursementClaimEntity {
  id: string;
  claimNo: string;
  claimType: ReimbursementClaimType;
  status: ReimbursementClaimStatus;
  applicantUserId: string;
  applicantName: string;
  applicantTitleCode: string | null;
  applicantTitleName: string | null;
  departmentId: string;
  departmentName: string;
  reason: string;
  fillDate: string;
  travelStartDate: string | null;
  travelStartHalf: 'am' | 'pm' | null;
  travelEndDate: string | null;
  travelEndHalf: 'am' | 'pm' | null;
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

/** 报销明细行。 */
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

/** 已绑定的上传附件。 */
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

/** 审批任务实例。 */
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

/** 报销操作日志。 */
export interface ReimbursementLogEntity {
  id: string;
  claimId: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  taskId: string | null;
  comment: string | null;
  createdAt: string;
}

/** 审批流预览节点上的处理人。 */
export interface ReimbursementApprovalPreviewAssignee {
  userId: string;
  name: string;
}

/** 审批流预览节点。 */
export interface ReimbursementApprovalPreviewNode {
  stageCode: string;
  stageName: string;
  status: ReimbursementApprovalPreviewNodeStatus;
  assignees: ReimbursementApprovalPreviewAssignee[];
}

/** 详情页使用的审批流预览。 */
export interface ReimbursementApprovalPreview {
  claimId: string;
  claimStatus: ReimbursementClaimStatus;
  currentStageCode: string | null;
  currentStageName: string | null;
  nodes: ReimbursementApprovalPreviewNode[];
}

/** 报销单详情响应。 */
export interface ReimbursementClaimDetail extends ReimbursementClaimEntity {
  items: ReimbursementItemEntity[];
  attachments: ReimbursementAttachmentEntity[];
  tasks: ReimbursementApprovalTaskEntity[];
  logs: ReimbursementLogEntity[];
  approvalPreview: ReimbursementApprovalPreview;
}

/** 新建或编辑时提交的明细行。 */
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
  meta?: TravelReimbursementItemMeta | null;
  sort?: number;
}

/** 创建报销单请求体。 */
export interface CreateReimbursementClaimInput {
  claimType: ReimbursementClaimType;
  departmentId?: string;
  reason: string;
  fillDate?: string;
  travelStartDate?: string | null;
  travelStartHalf?: 'am' | 'pm' | null;
  travelEndDate?: string | null;
  travelEndHalf?: 'am' | 'pm' | null;
  travelDays?: number | null;
  receiptCount?: number | null;
  advanceAmount?: number;
  attachments?: AttachReimbursementUploadInput[];
  items?: ReimbursementItemInput[];
}

/** 编辑报销单请求体。 */
export interface UpdateReimbursementClaimInput {
  departmentId?: string;
  reason?: string;
  fillDate?: string;
  travelStartDate?: string | null;
  travelStartHalf?: 'am' | 'pm' | null;
  travelEndDate?: string | null;
  travelEndHalf?: 'am' | 'pm' | null;
  travelDays?: number | null;
  receiptCount?: number | null;
  advanceAmount?: number;
  items?: ReimbursementItemInput[];
}

/** 审批动作通用请求体。 */
export interface ReimbursementActionInput {
  taskId: string;
  comment?: string | null;
}

/** 转交与加签请求体。 */
export interface ReimbursementTransferInput extends ReimbursementActionInput {
  targetUserId: string;
}

/** 报销单附件绑定输入。 */
export interface AttachReimbursementUploadInput {
  uploadId: string;
  category: ReimbursementAttachmentCategory;
}

/** 报销单列表筛选条件。 */
export interface ReimbursementListQuery {
  page?: number;
  pageSize?: number;
  scope?: ReimbursementListScope;
  claimType?: ReimbursementClaimType | '';
  status?: ReimbursementClaimStatus | '';
  departmentId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** 报销统计筛选条件。 */
export interface ReimbursementStatsQuery {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  claimType?: ReimbursementClaimType | '';
}

/** 报销工作台接口响应。 */
export interface ReimbursementDashboard {
  todoCount: number;
  myApprovingCount: number;
  completedThisMonthAmount: number;
  recentTodos: ReimbursementClaimEntity[];
  recentClaims: ReimbursementClaimEntity[];
}

/** 报销统计接口响应。 */
export interface ReimbursementStats {
  byMonth: Array<{ month: string; totalAmount: number; count: number }>;
  byType: Array<{ claimType: ReimbursementClaimType; totalAmount: number; count: number }>;
  byDepartment: Array<{ departmentId: string; departmentName: string; totalAmount: number; count: number }>;
  byStatus: Array<{ status: ReimbursementClaimStatus; totalAmount: number; count: number }>;
}

export type ReimbursementClaimListResult = PageResult<ReimbursementClaimEntity>;
