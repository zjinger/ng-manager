import type { PageResult } from "../../shared/http/pagination";

export type RdItemType = "feature" | "task" | "improvement";
export type RdItemPriority = "low" | "medium" | "high" | "critical";
export type RdItemStatus = "todo" | "doing" | "blocked" | "done" | "accepted" | "closed";
export type RdAction = "create" | "update" | "start" | "block" | "resume" | "complete" | "accept" | "close";

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
  description: string | null;
  stageId: string | null;
  type: RdItemType;
  status: RdItemStatus;
  priority: RdItemPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  creatorId: string;
  creatorName: string;
  reviewerId: string | null;
  reviewerName: string | null;
  progress: number;
  planStartAt: string | null;
  planEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  blockerReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdLogEntity {
  id: string;
  projectId: string;
  itemId: string;
  actionType: RdAction;
  content: string | null;
  operatorId: string | null;
  operatorName: string | null;
  metaJson: string | null;
  createdAt: string;
}

export interface RdDashboardTodo {
  kind: "rd_assigned" | "rd_review";
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
  projectId: string;
}

export interface RdDashboardActivity {
  kind: "rd_activity";
  entityId: string;
  code: string;
  title: string;
  action: string;
  summary: string | null;
  createdAt: string;
  projectId: string;
}

export interface CreateRdStageInput {
  projectId: string;
  name: string;
  sort?: number;
}

export interface UpdateRdStageInput {
  name?: string;
  sort?: number;
  enabled?: boolean;
}

export interface ListRdStagesQuery {
  projectId: string;
}

export interface CreateRdItemInput {
  projectId: string;
  title: string;
  description?: string;
  stageId?: string | null;
  type?: RdItemType;
  priority?: RdItemPriority;
  assigneeId?: string | null;
  reviewerId?: string | null;
  planStartAt?: string;
  planEndAt?: string;
}

export interface UpdateRdItemInput {
  title?: string;
  description?: string | null;
  stageId?: string | null;
  type?: RdItemType;
  priority?: RdItemPriority;
  assigneeId?: string | null;
  reviewerId?: string | null;
  progress?: number;
  planStartAt?: string | null;
  planEndAt?: string | null;
}

export interface BlockRdItemInput {
  blockerReason?: string;
}

export interface ListRdItemsQuery {
  page?: number;
  pageSize?: number;
  projectId?: string;
  stageId?: string;
  status?: RdItemStatus;
  type?: RdItemType;
  priority?: RdItemPriority;
  assigneeId?: string;
  keyword?: string;
}

export type RdItemListResult = PageResult<RdItemEntity>;
