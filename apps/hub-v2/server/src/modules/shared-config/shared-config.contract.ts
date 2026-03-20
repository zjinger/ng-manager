import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateSharedConfigInput,
  ListSharedConfigsQuery,
  PublicSharedConfigsQuery,
  SharedConfigEntity,
  SharedConfigListResult,
  UpdateSharedConfigInput
} from "./shared-config.types";

export interface SharedConfigCommandContract {
  create(input: CreateSharedConfigInput, ctx: RequestContext): Promise<SharedConfigEntity>;
  update(id: string, input: UpdateSharedConfigInput, ctx: RequestContext): Promise<SharedConfigEntity>;
}

export interface SharedConfigQueryContract {
  list(query: ListSharedConfigsQuery, ctx: RequestContext): Promise<SharedConfigListResult>;
  getById(id: string, ctx: RequestContext): Promise<SharedConfigEntity>;
  listPublic(query: PublicSharedConfigsQuery, ctx: RequestContext): Promise<SharedConfigEntity[]>;
}
