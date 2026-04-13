import type { PageResult } from '@core/types';

export type RdItemType = 'feature_dev' | 'tech_refactor' | 'integration' | 'env_setup';
export type RdItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type RdItemStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'accepted' | 'closed';
export type RdAction =
  | 'create'
  | 'update'
  | 'start'
  | 'block'
  | 'resume'
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
  { label: '功能实现', value: 'feature_dev' },
  { label: '技术改造', value: 'tech_refactor' },
  { label: '联调协作', value: 'integration' },
  { label: '环境准备', value: 'env_setup' },
];

export const RD_TYPE_LABELS: Record<RdItemType, string> = {
  feature_dev: '功能实现',
  tech_refactor: '技术改造',
  integration: '联调协作',
  env_setup: '环境准备',
};

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

export interface BlockRdItemInput {
  blockerReason?: string;
}

export interface AdvanceRdStageInput {
  stageId: string;
}

export interface UpdateRdItemInput {
  version: number;
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
