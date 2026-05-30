import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreatePersonalTodoInput,
  CreatePersonalTodoTagInput,
  PersonalTodoEntity,
  PersonalTodoSnapshot,
  PersonalTodoTagEntity,
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
  createTag(input: CreatePersonalTodoTagInput, ctx: RequestContext): Promise<PersonalTodoTagEntity>;
  updateTag(id: string, input: UpdatePersonalTodoTagInput, ctx: RequestContext): Promise<PersonalTodoTagEntity>;
  deleteTag(id: string, ctx: RequestContext): Promise<{ id: string }>;
}

export interface PersonalTodoQueryContract {
  getSnapshot(ctx: RequestContext): Promise<PersonalTodoSnapshot>;
}

