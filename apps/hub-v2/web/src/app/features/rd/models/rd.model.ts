import type { PageResult } from '@core/types';

export type RdItemType =
  | 'feature_dev'
  | 'tech_refactor'
  | 'integration'
  | 'env_setup'
  | 'requirement_confirmation'
  | 'solution_design'
  | 'testing_validation'
  | 'delivery_launch'
  | 'project_closure';
export type RdItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type RdItemStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'accepted' | 'closed';
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
}

export type RdListResult = PageResult<RdItemEntity>;

export const RD_TYPE_OPTIONS: Array<{ label: string; value: RdItemType }> = [
  { label: '功能开发', value: 'feature_dev' },
  { label: '技术改造', value: 'tech_refactor' },
  { label: '联调协作', value: 'integration' },
  { label: '环境准备', value: 'env_setup' },
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
  env_setup: '环境准备',
  requirement_confirmation: '需求确认',
  solution_design: '方案设计',
  testing_validation: '测试验证',
  delivery_launch: '交付上线',
  project_closure: '项目结项',
};

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

export interface UpdateRdItemProgressInput {
  progress: number;
  note?: string;
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

export function getRdMemberIds(item: Pick<RdItemEntity, 'memberIds' | 'assigneeId'> | null | undefined): string[] {
  if (!item) {
    return [];
  }
  const ids = Array.isArray(item.memberIds) ? item.memberIds : [];
  const fallbackAssigneeId = item.assigneeId ? [item.assigneeId] : [];
  return Array.from(new Set([...ids, ...fallbackAssigneeId]));
}
