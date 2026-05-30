export type PersonalTodoPriority = "low" | "medium" | "high" | "critical";
export type PersonalTodoStatus = "todo" | "doing" | "done";
export type PersonalTodoTagColor = "blue" | "purple" | "green" | "red" | "orange" | "cyan" | "gray";

export interface PersonalTodoEntity {
  id: string;
  title: string;
  desc?: string;
  priority: PersonalTodoPriority;
  status: PersonalTodoStatus;
  due?: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTodoTagEntity {
  id: string;
  name: string;
  color: PersonalTodoTagColor;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTodoSnapshot {
  todos: PersonalTodoEntity[];
  tags: PersonalTodoTagEntity[];
}

export interface CreatePersonalTodoInput {
  title: string;
  desc?: string;
  priority: PersonalTodoPriority;
  status: PersonalTodoStatus;
  due?: string | null;
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

