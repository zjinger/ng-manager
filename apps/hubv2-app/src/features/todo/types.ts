export type MobileTargetType = 'issue' | 'rd';
export type TodoFilter = 'all' | 'issue' | 'rd' | 'verify';

export interface MobileTodoItem {
  id: string;
  targetType: MobileTargetType;
  targetId: string;
  code: string;
  title: string;
  status: string;
  priority: string | null;
  projectId: string;
  updatedAt: string;
  assigneeName: string | null;
  summary: string | null;
  mobileRoute: string;
}

export interface MobileTodoPage {
  items: MobileTodoItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MobileTodoDetail {
  targetType: MobileTargetType;
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string | null;
  projectId: string;
  descriptionMd: string | null;
  assigneeName: string | null;
  verifierName: string | null;
  progress: number | null;
  updatedAt: string;
  timeline: MobileTimelineItem[];
  availableActions: MobileTodoAction[];
}

export interface MobileTimelineItem {
  id: string;
  kind: 'comment' | 'activity' | 'progress' | 'stage_task';
  authorName: string | null;
  content: string | null;
  action: string | null;
  createdAt: string;
}

export type IssueTodoAction = 'start' | 'wait_update' | 'resolve' | 'verify' | 'reopen' | 'close';
export type RdTodoAction = 'start' | 'block' | 'resume' | 'complete' | 'accept' | 'reopen' | 'close';
export type MobileTodoAction = IssueTodoAction | RdTodoAction;

export interface FetchTodoListParams {
  category?: TodoFilter;
  projectId?: string;
  status?: string;
  priority?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const todoFilterLabels: Record<TodoFilter, string> = {
  all: '全部',
  issue: 'Issue',
  rd: '研发项',
  verify: '待验证',
};

export const todoTypeLabels: Record<MobileTargetType, string> = {
  issue: 'Issue',
  rd: '研发项',
};

export const todoStatusLabels: Record<string, string> = {
  open: '待处理',
  todo: '待处理',
  pending: '待处理',
  in_progress: '进行中',
  doing: '进行中',
  pending_update: '待更新',
  wait_update: '待更新',
  resolved: '已解决',
  verifying: '待验证',
  verified: '已验证',
  accepted: '已验收',
  completed: '已完成',
  done: '已完成',
  closed: '已关闭',
  reopened: '已重开',
  blocked: '已阻塞',
};

export const todoPriorityLabels: Record<string, string> = {
  low: '低优先级',
  medium: '中优先级',
  normal: '普通',
  high: '高优先级',
  critical: '紧急',
  urgent: '紧急',
};

export const todoActionLabels: Record<MobileTodoAction, string> = {
  start: '开始处理',
  wait_update: '等待更新',
  resolve: '标记解决',
  verify: '验证通过',
  reopen: '重新打开',
  close: '关闭',
  block: '标记阻塞',
  resume: '恢复处理',
  complete: '标记完成',
  accept: '验收通过',
};

export function getTodoStatusLabel(status: string): string {
  return todoStatusLabels[status] ?? status;
}

export function getTodoPriorityLabel(priority: string | null | undefined): string | null {
  if (!priority) return null;
  return todoPriorityLabels[priority] ?? priority;
}

export function getTodoActionLabel(action: MobileTodoAction): string {
  return todoActionLabels[action] ?? action;
}

export function encodeTodoRouteId(item: Pick<MobileTodoItem, 'targetType' | 'targetId'>): string {
  return `${item.targetType}:${item.targetId}`;
}

export function parseTodoRouteId(value: string | string[] | undefined): Pick<MobileTodoItem, 'targetType' | 'targetId'> | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const [targetType, ...rest] = decodeURIComponent(raw).split(':');
  const targetId = rest.join(':');
  if ((targetType !== 'issue' && targetType !== 'rd') || !targetId) return null;
  return { targetType, targetId };
}
