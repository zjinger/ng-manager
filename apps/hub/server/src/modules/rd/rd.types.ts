export type RdItemType = "feature_dev" | "tech_refactor" | "integration" | "env_setup";
export type RdItemStatus = "todo" | "doing" | "blocked" | "done" | "canceled";
export type RdItemPriority = "low" | "medium" | "high" | "urgent";
export type RdLogActionType =
  | "create"
  | "edit"
  | "status_change"
  | "progress_update"
  | "block"
  | "unblock"
  | "comment"
  | "delete";

export interface RdStageEntity {
  id: string;
  projectId: string;
  name: string;
  sort: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RdItemEntity {
  id: string;
  projectId: string;
  rdNo: string;
  title: string;
  description: string;
  stageId: string;
  stageName?: string | null;
  type: RdItemType;
  status: RdItemStatus;
  priority: RdItemPriority;
  assigneeId?: string | null;
  assigneeName?: string | null;
  creatorId: string;
  creatorName: string;
  reviewerId?: string | null;
  reviewerName?: string | null;
  progress: number;
  planStartAt?: string | null;
  planEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  blockerReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdLogEntity {
  id: string;
  projectId: string;
  itemId: string;
  actionType: RdLogActionType;
  content: string;
  operatorId?: string | null;
  operatorName?: string | null;
  createdAt: string;
}

export interface RdOverview {
  totalCount: number;
  doingCount: number;
  blockedCount: number;
  doneCount: number;
  overdueCount: number;
  completionRate: number;
}

export interface RdItemDetailResult {
  item: RdItemEntity;
  logs: RdLogEntity[];
}

export interface RdListQuery {
  projectId: string;
  stageId?: string;
  status?: RdItemStatus;
  priority?: RdItemPriority;
  type?: RdItemType;
  assigneeId?: string;
  overdue?: boolean;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface CurrentUserRdListQuery {
  projectId?: string;
  stageId?: string;
  status?: RdItemStatus;
  priority?: RdItemPriority;
  type?: RdItemType;
  assigneeId?: string;
  overdue?: boolean;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface RdItemListResult {
  items: RdItemEntity[];
  page: number;
  pageSize: number;
  total: number;
}

export interface OperatorInput {
  operatorId?: string | null;
  operatorName?: string | null;
}

export interface CreateRdStageInput extends OperatorInput {
  name: string;
  sort?: number;
  enabled?: boolean;
}

export interface UpdateRdStageInput extends OperatorInput {
  name?: string;
  sort?: number;
  enabled?: boolean;
}

export interface CreateRdItemInput extends OperatorInput {
  projectId: string;
  title: string;
  description?: string;
  stageId: string;
  type?: RdItemType;
  status?: RdItemStatus;
  priority?: RdItemPriority;
  assigneeId?: string | null;
  reviewerId?: string | null;
  progress?: number;
  planStartAt?: string | null;
  planEndAt?: string | null;
  blockerReason?: string | null;
}

export interface UpdateRdItemInput extends OperatorInput {
  title?: string;
  description?: string;
  stageId?: string;
  type?: RdItemType;
  priority?: RdItemPriority;
  assigneeId?: string | null;
  reviewerId?: string | null;
  progress?: number;
  planStartAt?: string | null;
  planEndAt?: string | null;
  blockerReason?: string | null;
}

export interface ChangeRdItemStatusInput extends OperatorInput {
  status: RdItemStatus;
  blockerReason?: string | null;
}

export interface UpdateRdItemProgressInput extends OperatorInput {
  progress: number;
}

export interface AddRdCommentInput extends OperatorInput {
  content: string;
}

export type UpdateRdItemPatch = Partial<{
  title: string;
  description: string;
  stageId: string;
  type: RdItemType;
  status: RdItemStatus;
  priority: RdItemPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  progress: number;
  planStartAt: string | null;
  planEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  blockerReason: string | null;
  updatedAt: string;
}>;
