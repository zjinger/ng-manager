import type { PageResult } from '@core/types';

export type RdItemType =
  | 'feature_dev'
  | 'tech_refactor'
  | 'integration'
  | 'env_setup'
  | 'requirement_confirmation'
  | 'bug_fix'
  | 'solution_design'
  | 'testing_validation'
  | 'delivery_launch'
  | 'project_closure';
export type RdItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type RdItemStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'accepted' | 'closed';
export type RdStageTaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
export type RdMainStageKey =
  | 'requirement_confirmation'
  | 'solution_design'
  | 'feature_dev'
  | 'testing_validation'
  | 'delivery_launch'
  | 'project_closure';
export const RD_VISIBLE_STATUSES: RdItemStatus[] = ['todo', 'doing', 'blocked', 'done', 'accepted'];
export type RdAction =
  | 'create'
  | 'update'
  | 'start'
  | 'block'
  | 'resume'
  | 'reopen'
  | 'complete'
  | 'accept'
  | 'close'
  | 'advance_stage'
  | 'delete';

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

export type RdMemberBlockStatus = 'active' | 'resolved';

export interface RdMemberBlockEntity {
  id: string;
  projectId: string;
  itemId: string;
  userId: string;
  userName: string | null;
  reason: string;
  status: RdMemberBlockStatus;
  blockedAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolveNote: string | null;
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

export interface RdStageHistorySnapshot {
  stageId: string | null;
  stageName: string;
  status: RdItemStatus;
  progress: number;
  assigneeId: string | null;
  assigneeName: string | null;
  verifierId: string | null;
  verifierName: string | null;
  memberIds: string[];
  memberNames: string[];
  planStartAt: string | null;
  planEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  blockerReason: string | null;
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

export interface RdListQuery {
  page: number;
  pageSize: number;
  projectId?: string;
  stageId?: string;
  stageIds?: string[];
  status?: RdItemStatus[];
  type?: RdItemType[];
  priority?: RdItemPriority[];
  assigneeIds?: string[];
  assigneeId?: string;
  keyword?: string;
  includeClosed?: boolean;
  sortBy?: 'updatedAt' | 'createdAt';
  sortOrder?: 'desc' | 'asc';
}

export interface RdStageTaskEntity {
  id: string;
  projectId: string;
  itemId: string;
  stageKey: string;
  title: string;
  description: string | null;
  status: RdStageTaskStatus;
  ownerId: string | null;
  ownerName: string | null;
  ownerIds: string[];
  ownerNames: string[];
  progress: number;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sortOrder: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  ownerProgresses: RdStageTaskOwnerEntity[];
}

export interface RdStageTaskOwnerEntity {
  id: string;
  taskId: string;
  projectId: string;
  itemId: string;
  userId: string;
  userName: string | null;
  status: RdStageTaskStatus;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdStageTaskTemplateEntity {
  id: string;
  projectId: string;
  stageId: string;
  stageKey: string;
  title: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RdItemStageNoteEntity {
  id: string;
  projectId: string;
  itemId: string;
  stageId: string;
  stageKey: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdStageTaskTemplateSelectionInput {
  templateId: string;
  ownerId?: string | null;
}

export interface RdInitialStageTaskInput {
  templateId?: string | null;
  title: string;
  description?: string | null;
  ownerId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
}

export type RdListResult = PageResult<RdItemEntity>;

export const RD_TYPE_OPTIONS: Array<{ label: string; value: RdItemType }> = [
  { label: '功能开发', value: 'feature_dev' },
  { label: '技术改造', value: 'tech_refactor' },
  { label: '联调协作', value: 'integration' },
  { label: '环境准备', value: 'env_setup' },
  { label: 'BUG修复', value: 'bug_fix' },
  { label: '需求确认', value: 'requirement_confirmation' },
  { label: '方案设计', value: 'solution_design' },
  { label: '测试验证', value: 'testing_validation' },
  { label: '交付上线', value: 'delivery_launch' },
  { label: '项目结项', value: 'project_closure' },
];

export const RD_TYPE_LABELS: Record<RdItemType, string> = {
  feature_dev: '功能开发',
  tech_refactor: '技术改造',
  integration: '联调协作',
  bug_fix: 'BUG修复',
  env_setup: '环境准备',
  requirement_confirmation: '需求确认',
  solution_design: '方案设计',
  testing_validation: '测试验证',
  delivery_launch: '交付上线',
  project_closure: '项目结项',
};

export const RD_STAGE_DEFINITIONS: Array<{ key: RdMainStageKey; name: string }> = [
  { key: 'requirement_confirmation', name: '需求确认' },
  { key: 'solution_design', name: '方案设计' },
  { key: 'feature_dev', name: '功能开发' },
  { key: 'testing_validation', name: '测试验证' },
  { key: 'delivery_launch', name: '交付上线' },
  { key: 'project_closure', name: '项目结项' },
];

export const RD_STAGE_TASK_STATUS_LABELS: Record<RdStageTaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  done: '已完成',
  blocked: '阻塞',
  cancelled: '已取消',
};

const RD_STAGE_KEY_BY_NAME = new Map(RD_STAGE_DEFINITIONS.map((stage) => [stage.name, stage.key]));
const RD_STAGE_NAME_BY_KEY = new Map(RD_STAGE_DEFINITIONS.map((stage) => [stage.key, stage.name]));

export function resolveRdStageKey(stage: Pick<RdStageEntity, 'id' | 'name'> | string | null | undefined): string {
  if (!stage) {
    return 'unknown';
  }
  if (typeof stage === 'string') {
    return RD_STAGE_KEY_BY_NAME.get(stage.trim()) ?? stage.trim();
  }
  return RD_STAGE_KEY_BY_NAME.get(stage.name.trim()) ?? stage.id;
}

export function resolveRdStageName(stageKey: string): string {
  return RD_STAGE_NAME_BY_KEY.get(stageKey as RdMainStageKey) ?? stageKey;
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
  stageTaskTemplates?: RdStageTaskTemplateSelectionInput[];
  stageTasks?: RdInitialStageTaskInput[];
}

export interface BlockRdItemInput {
  blockerReason?: string;
}

export interface CreateRdMemberBlockInput {
  reason: string;
}

export interface ResolveRdMemberBlockInput {
  note?: string;
}

export interface CloseRdItemInput {
  reason?: string;
}

export interface CompleteRdItemInput {
  reason?: string;
}

export interface AdvanceRdStageInput {
  stageId: string;
  memberIds?: string[];
  description?: string;
  planStartAt?: string;
  planEndAt?: string;
  stageTasks?: RdInitialStageTaskInput[];
  stageTaskTemplates?: RdStageTaskTemplateSelectionInput[];
}

export interface CreateRdStageTaskTemplateInput {
  stageId: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
  enabled?: boolean;
}

export interface UpdateRdStageTaskTemplateInput {
  title?: string;
  description?: string | null;
  sortOrder?: number;
  enabled?: boolean;
}

export interface CreateRdStageTaskInput {
  stageKey: string;
  title: string;
  description?: string | null;
  status?: RdStageTaskStatus;
  ownerId?: string | null;
  ownerName?: string | null;
  ownerIds?: string[];
  progress?: number;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  sortOrder?: number;
  remark?: string | null;
}

export interface UpdateRdStageTaskInput {
  stageKey?: string;
  title?: string;
  description?: string | null;
  status?: RdStageTaskStatus;
  ownerId?: string | null;
  ownerName?: string | null;
  ownerIds?: string[];
  progress?: number;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  sortOrder?: number;
  remark?: string | null;
}

export interface UpdateRdItemWithStageTasksInput extends UpdateRdItemInput {
  taskCreates?: CreateRdStageTaskInput[];
  taskUpdates?: Array<{ taskId: string; input: UpdateRdStageTaskInput }>;
  taskCancelIds?: string[];
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
  planStartAt?: string | null;
  planEndAt?: string | null;
  stageDescription?: string | null;
}

export interface UpdateRdItemProgressInput {
  progress: number;
  note?: string;
  blockReason?: string;
  resolveBlockId?: string;
  stageTaskId?: string;
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

export function getRdMemberIds(
  item: Pick<RdItemEntity, 'memberIds' | 'assigneeId'> | null | undefined,
): string[] {
  if (!item) {
    return [];
  }
  const ids = Array.isArray(item.memberIds) ? item.memberIds : [];
  const fallbackAssigneeId = item.assigneeId ? [item.assigneeId] : [];
  return Array.from(new Set([...ids, ...fallbackAssigneeId]));
}
