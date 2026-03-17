import type { ProjectMemberItem } from '../../projects/projects.model';

export type RdItemType = 'feature_dev' | 'tech_refactor' | 'integration' | 'env_setup';
export type RdItemStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'canceled';
export type RdItemPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RdLogActionType = 'create' | 'edit' | 'status_change' | 'progress_update' | 'block' | 'unblock' | 'comment' | 'delete';

export interface RdProjectOption {
  id: string;
  projectKey: string;
  name: string;
}

export interface RdStageItem {
  id: string;
  projectId: string;
  name: string;
  sort: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RdItem {
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

export interface RdLogItem {
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
  item: RdItem;
  logs: RdLogItem[];
}

export interface RdItemListResult {
  items: RdItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RdFilterValue {
  projectId: string;
  stageId: string;
  status: string;
  priority: string;
  type: string;
  assigneeId: string;
  keyword: string;
}

export interface RdItemFormValue {
  title: string;
  description: string;
  stageId: string;
  type: RdItemType;
  priority: RdItemPriority;
  assigneeId: string;
  reviewerId: string;
  progress: number;
  planStartAt: string;
  planEndAt: string;
  blockerReason: string;
}

export interface RdStageFormValue {
  name: string;
  sort: number;
  enabled: boolean;
}

export interface RdStatusChangeValue {
  status: RdItemStatus;
  blockerReason?: string;
}

export const RD_TYPE_OPTIONS: Array<{ value: RdItemType; label: string; color: string }> = [
  { value: 'feature_dev', label: '功能开发', color: 'blue' },
  { value: 'tech_refactor', label: '技术改造', color: 'purple' },
  { value: 'integration', label: '联调协作', color: 'cyan' },
  { value: 'env_setup', label: '环境准备', color: 'gold' }
];

export const RD_STATUS_OPTIONS: Array<{ value: RdItemStatus; label: string; color: string }> = [
  { value: 'todo', label: '待开始', color: 'default' },
  { value: 'doing', label: '进行中', color: 'processing' },
  { value: 'blocked', label: '阻塞', color: 'red' },
  { value: 'done', label: '已完成', color: 'green' },
  { value: 'canceled', label: '已取消', color: 'default' }
];

export const RD_PRIORITY_OPTIONS: Array<{ value: RdItemPriority; label: string; color: string }> = [
  { value: 'low', label: '低', color: 'default' },
  { value: 'medium', label: '中', color: 'blue' },
  { value: 'high', label: '高', color: 'orange' },
  { value: 'urgent', label: '紧急', color: 'red' }
];

export function rdTypeLabel(type: RdItemType): string {
  return RD_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

export function rdTypeColor(type: RdItemType): string {
  return RD_TYPE_OPTIONS.find((item) => item.value === type)?.color ?? 'default';
}

export function rdStatusLabel(status: RdItemStatus): string {
  return RD_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function rdStatusColor(status: RdItemStatus): string {
  return RD_STATUS_OPTIONS.find((item) => item.value === status)?.color ?? 'default';
}

export function rdPriorityLabel(priority: RdItemPriority): string {
  return RD_PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ?? priority;
}

export function rdPriorityColor(priority: RdItemPriority): string {
  return RD_PRIORITY_OPTIONS.find((item) => item.value === priority)?.color ?? 'default';
}

export function rdLogActionLabel(actionType: RdLogActionType): string {
  if (actionType === 'create') return '创建';
  if (actionType === 'edit') return '编辑';
  if (actionType === 'status_change') return '状态变更';
  if (actionType === 'progress_update') return '进度更新';
  if (actionType === 'block') return '标记阻塞';
  if (actionType === 'unblock') return '解除阻塞';
  if (actionType === 'comment') return '备注';
  if (actionType === 'delete') return '删除';
  return actionType;
}

export function memberDisplay(member: ProjectMemberItem): string {
  return member.displayName?.trim() || member.userId;
}
