export type TodoPriority = 'low' | 'medium' | 'high' | 'critical';
export type TodoStatus = 'todo' | 'doing' | 'done';
export type TodoViewMode = 'list' | 'board';
export type TodoStatusFilter = TodoStatus | 'all';
export type TodoPriorityFilter = TodoPriority | 'all';
export type TodoTagFilter = string | 'all';
export type TodoTagColor = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'cyan' | 'gray';
export type TodoFolderColor = TodoTagColor;
export type TodoScope = 'all' | 'folder' | 'recycle';
export type TodoQueryScope = 'active' | 'recycle';
export type TodoGroupBy = 'none' | 'status' | 'priority' | 'folder' | 'due';

export interface Todo {
  id: string;
  title: string;
  desc?: string;
  priority: TodoPriority;
  status: TodoStatus;
  due?: string | null;
  folderId?: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface TodoDraft {
  title: string;
  desc?: string;
  priority: TodoPriority;
  status: TodoStatus;
  due?: string | null;
  folderId?: string | null;
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

export interface TodoFolderEntity {
  id: string;
  name: string;
  color: TodoFolderColor;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoFolderDraft {
  name: string;
  color: TodoFolderColor;
}

export interface TodoPageQuery {
  scope: TodoQueryScope;
  page: number;
  pageSize: number;
  status: TodoStatusFilter;
  priority: TodoPriorityFilter;
  tagId: TodoTagFilter;
  folderId: string | 'all' | 'none';
  keyword: string;
  groupBy: TodoGroupBy;
}

export interface TodoPage {
  items: Todo[];
  total: number;
  page: number;
  pageSize: number;
  tags: TodoTagEntity[];
  folders: TodoFolderEntity[];
  stats: TodoStats;
  folderCounts: Record<string, number>;
  unfiledCount: number;
  recycleCount: number;
  unfinishedCount: number;
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

export interface TodoGroup {
  key: string;
  label: string;
  items: Todo[];
}

export type TodoListNode =
  | {
      id: string;
      type: 'group';
      label: string;
      count: number;
    }
  | {
      id: string;
      type: 'todo';
      todo: Todo;
    };

export interface TodoOption<T extends string> {
  value: T;
  label: string;
}

export const TODO_PAGE_SIZE_OPTIONS = [50, 100, 200];

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

export const TODO_GROUP_OPTIONS: TodoOption<TodoGroupBy>[] = [
  { value: 'none', label: '不分组' },
  { value: 'status', label: '按状态分组' },
  { value: 'priority', label: '按优先级分组' },
  { value: 'folder', label: '按文件夹分组' },
  { value: 'due', label: '按截止日期分组' },
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
