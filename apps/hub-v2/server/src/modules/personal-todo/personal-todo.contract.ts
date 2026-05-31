import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreatePersonalTodoInput,
  CreatePersonalTodoFolderInput,
  CreatePersonalTodoTagInput,
  ListPersonalTodoInput,
  PersonalTodoEntity,
  PersonalTodoFolderEntity,
  PersonalTodoSnapshot,
  PersonalTodoTagEntity,
  UpdatePersonalTodoFolderInput,
  UpdatePersonalTodoInput,
  UpdatePersonalTodoStatusInput,
  UpdatePersonalTodoTagInput
} from "./personal-todo.types";

export interface PersonalTodoCommandContract {
  createTodo(input: CreatePersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoEntity>;
  updateTodo(id: string, input: UpdatePersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoEntity>;
  updateTodoStatus(id: string, input: UpdatePersonalTodoStatusInput, ctx: RequestContext): Promise<PersonalTodoEntity>;
  deleteTodo(id: string, ctx: RequestContext): Promise<{ id: string }>;
  clearCompleted(ctx: RequestContext): Promise<{ deleted: number }>;
  restoreTodo(id: string, ctx: RequestContext): Promise<PersonalTodoEntity>;
  permanentlyDeleteTodo(id: string, ctx: RequestContext): Promise<{ id: string }>;
  emptyRecycle(ctx: RequestContext): Promise<{ deleted: number }>;
  createTag(input: CreatePersonalTodoTagInput, ctx: RequestContext): Promise<PersonalTodoTagEntity>;
  updateTag(id: string, input: UpdatePersonalTodoTagInput, ctx: RequestContext): Promise<PersonalTodoTagEntity>;
  deleteTag(id: string, ctx: RequestContext): Promise<{ id: string }>;
  createFolder(input: CreatePersonalTodoFolderInput, ctx: RequestContext): Promise<PersonalTodoFolderEntity>;
  updateFolder(id: string, input: UpdatePersonalTodoFolderInput, ctx: RequestContext): Promise<PersonalTodoFolderEntity>;
  deleteFolder(id: string, ctx: RequestContext): Promise<{ id: string }>;
}

export interface PersonalTodoQueryContract {
  getSnapshot(input: ListPersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoSnapshot>;
}
