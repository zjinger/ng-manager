import type { PageResult } from '../../../core/types/page.types';

export type RdItemType = 'feature' | 'task' | 'improvement';
export type RdItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type RdItemStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'accepted' | 'closed';

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

export interface RdListQuery {
  page: number;
  pageSize: number;
  projectId?: string;
  stageId?: string;
  status?: RdItemStatus | '';
  type?: RdItemType | '';
  priority?: RdItemPriority | '';
  assigneeId?: string;
  keyword?: string;
}

export type RdListResult = PageResult<RdItemEntity>;

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
