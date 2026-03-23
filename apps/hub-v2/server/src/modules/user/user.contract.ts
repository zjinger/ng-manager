import type { RequestContext } from "../../shared/context/request-context";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput, UserEntity, UserListResult } from "./user.types";

export interface UserCommandContract {
  create(input: CreateUserInput, ctx: RequestContext): Promise<UserEntity>;
  update(id: string, input: UpdateUserInput, ctx: RequestContext): Promise<UserEntity>;
}

export interface UserQueryContract {
  list(query: ListUsersQuery, ctx: RequestContext): Promise<UserListResult>;
  getById(id: string, ctx: RequestContext): Promise<UserEntity>;
}
