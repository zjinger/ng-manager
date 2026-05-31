export type PersonalTodoPriority = "low" | "medium" | "high" | "critical";
export type PersonalTodoStatus = "todo" | "doing" | "done";
export type PersonalTodoTagColor = "blue" | "purple" | "green" | "red" | "orange" | "cyan" | "gray";
export type PersonalTodoFolderColor = PersonalTodoTagColor;
export type PersonalTodoQueryScope = "active" | "recycle";
export type PersonalTodoGroupBy = "none" | "status" | "priority" | "folder" | "due";

export interface PersonalTodoEntity {
  id: string;
  title: string;
  desc?: string;
  priority: PersonalTodoPriority;
  status: PersonalTodoStatus;
  due?: string | null;
  folderId?: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PersonalTodoTagEntity {
  id: string;
  name: string;
  color: PersonalTodoTagColor;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTodoFolderEntity {
  id: string;
  name: string;
  color: PersonalTodoFolderColor;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTodoSnapshot {
  items: PersonalTodoEntity[];
  total: number;
  page: number;
  pageSize: number;
  tags: PersonalTodoTagEntity[];
  folders: PersonalTodoFolderEntity[];
  stats: PersonalTodoStats;
  folderCounts: Record<string, number>;
  unfiledCount: number;
  recycleCount: number;
  unfinishedCount: number;
}

export interface PersonalTodoStats {
  total: number;
  doing: number;
  done: number;
  overdue: number;
}

export interface ListPersonalTodoInput {
  scope: PersonalTodoQueryScope;
  page: number;
  pageSize: number;
  status?: PersonalTodoStatus | "all";
  priority?: PersonalTodoPriority | "all";
  tagId?: string | "all";
  folderId?: string | "all" | "none";
  keyword?: string;
  groupBy?: PersonalTodoGroupBy;
}

export interface CreatePersonalTodoInput {
  title: string;
  desc?: string;
  priority: PersonalTodoPriority;
  status: PersonalTodoStatus;
  due?: string | null;
  folderId?: string | null;
  tagIds: string[];
}

export interface UpdatePersonalTodoInput extends CreatePersonalTodoInput {}

export interface UpdatePersonalTodoStatusInput {
  status: PersonalTodoStatus;
}

export interface CreatePersonalTodoTagInput {
  name: string;
  color: PersonalTodoTagColor;
}

export interface UpdatePersonalTodoTagInput {
  name?: string;
  color?: PersonalTodoTagColor;
}

export interface CreatePersonalTodoFolderInput {
  name: string;
  color: PersonalTodoFolderColor;
}

export interface UpdatePersonalTodoFolderInput {
  name?: string;
  color?: PersonalTodoFolderColor;
}
