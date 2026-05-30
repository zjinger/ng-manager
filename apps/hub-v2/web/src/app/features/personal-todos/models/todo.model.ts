export type TodoPriority = 'low' | 'medium' | 'high' | 'critical';
export type TodoStatus = 'todo' | 'doing' | 'done';
export type TodoViewMode = 'list' | 'board';
export type TodoStatusFilter = TodoStatus | 'all';
export type TodoPriorityFilter = TodoPriority | 'all';
export type TodoTagFilter = string | 'all';
export type TodoTagColor = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'cyan' | 'gray';

export interface Todo {
  id: string;
  title: string;
  desc?: string;
  priority: TodoPriority;
  status: TodoStatus;
  due?: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TodoDraft {
  title: string;
  desc?: string;
  priority: TodoPriority;
  status: TodoStatus;
  due?: string | null;
  tagIds: string[];
}

export interface TodoTagEntity {
  id: string;
  name: string;
  color: TodoTagColor;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoTagDraft {
  name: string;
  color: TodoTagColor;
}

export interface TodoSnapshot {
  todos: Todo[];
  tags: TodoTagEntity[];
}

export interface TodoStats {
  total: number;
  doing: number;
  done: number;
  overdue: number;
}

export interface TodoBoardColumn {
  status: TodoStatus;
  label: string;
  items: Todo[];
}

export interface TodoOption<T extends string> {
  value: T;
  label: string;
}

export const TODO_CACHE_KEY = 'hub-v2:personal-todos:snapshot';

export const TODO_STATUS_OPTIONS: TodoOption<TodoStatus>[] = [
  { value: 'todo', label: '待办' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
];

export const TODO_PRIORITY_OPTIONS: TodoOption<TodoPriority>[] = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export const TODO_TAG_COLORS: Array<TodoOption<TodoTagColor> & { swatch: string }> = [
  { value: 'blue', label: '蓝色', swatch: '#1677ff' },
  { value: 'purple', label: '紫色', swatch: '#7c3aed' },
  { value: 'green', label: '绿色', swatch: '#16a34a' },
  { value: 'red', label: '红色', swatch: '#dc2626' },
  { value: 'orange', label: '橙色', swatch: '#ea580c' },
  { value: 'cyan', label: '青色', swatch: '#0891b2' },
  { value: 'gray', label: '灰色', swatch: '#64748b' },
];

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
};

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};
