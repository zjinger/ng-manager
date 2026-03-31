import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateUserInput,
  ListUsersQuery,
  ResetUserPasswordInput,
  ResetUserPasswordResult,
  UpdateUserInput,
  UserEntity,
  UserListResult
} from "./user.types";

export interface UserCommandContract {
  create(input: CreateUserInput, ctx: RequestContext): Promise<UserEntity>;
  update(id: string, input: UpdateUserInput, ctx: RequestContext): Promise<UserEntity>;
  resetPassword(id: string, input: ResetUserPasswordInput, ctx: RequestContext): Promise<ResetUserPasswordResult>;
}

export interface UserQueryContract {
  list(query: ListUsersQuery, ctx: RequestContext): Promise<UserListResult>;
  getById(id: string, ctx: RequestContext): Promise<UserEntity>;
}
