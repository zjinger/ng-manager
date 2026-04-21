import type { PageResult } from "../../shared/http/pagination";

export type RdItemType =
  | "feature_dev"
  | "tech_refactor"
  | "integration"
  | "env_setup"
  | "requirement_confirmation"
  | "solution_design"
  | "testing_validation"
  | "delivery_launch"
  | "project_closure";
export type RdItemPriority = "low" | "medium" | "high" | "critical";
export type RdItemStatus = "todo" | "doing" | "blocked" | "done" | "accepted" | "closed";
export type RdAction =
  | "create"
  | "update"
  | "start"
  | "block"
  | "resume"
  | "reopen"
  | "complete"
  | "accept"
  | "close"
  | "advance_stage"
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
  version: number;
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
  verifierId: string | null;
  verifierName: string | null;
  memberIds: string[];
  progress: number;
  planStartAt: string | null;
  planEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  blockerReason: string | null;
  stageTrail?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RdItemProgress {
  id: string;
  itemId: string;
  userId: string;
  userName: string | null;
  progress: number;
  note: string | null;
  updatedAt: string;
}

export interface RdProgressHistory {
  id: string;
  itemId: string;
  userId: string;
  userName: string | null;
  oldProgress: number | null;
  newProgress: number;
  note: string | null;
  createdAt: string;
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
  kind: "rd_assigned" | "rd_verify";
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
  sortAt?: string;
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
  memberIds?: string[];
  verifierId?: string | null;
  planStartAt?: string;
  planEndAt?: string;
}

export interface UpdateRdItemInput {
  version: number;
  title?: string;
  description?: string | null;
  stageId?: string | null;
  type?: RdItemType;
  priority?: RdItemPriority;
  memberIds?: string[];
  verifierId?: string | null;
  progress?: number;
  planStartAt?: string | null;
  planEndAt?: string | null;
}

export interface BlockRdItemInput {
  blockerReason?: string;
}

export interface CloseRdItemInput {
  reason?: string;
}

export interface AdvanceRdStageInput {
  stageId: string;
  memberIds?: string[];
  description?: string;
  planStartAt?: string;
  planEndAt?: string;
}

export interface ListRdItemsQuery {
  page?: number;
  pageSize?: number;
  projectId?: string;
  stageId?: string;
  stageIds?: string[];
  status?: RdItemStatus[];
  type?: RdItemType[];
  priority?: RdItemPriority[];
  assigneeIds?: string[];
  assigneeId?: string;
  keyword?: string;
}

export type RdItemListResult = PageResult<RdItemEntity>;

export interface UpdateRdItemProgressInput {
  progress: number;
  note?: string;
}

export interface ListRdProgressQuery {
  itemId: string;
}

export interface RdStageHistoryEntry {
  id: string;
  projectId: string;
  itemId: string;
  fromStageId: string | null;
  fromStageName: string;
  toStageId: string;
  toStageName: string;
  snapshotJson: string;
  operatorId: string | null;
  operatorName: string | null;
  createdAt: string;
}
