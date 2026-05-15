import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateSystemTitleInput,
  ListSystemTitlesQuery,
  SystemTitleEntity,
  UpdateSystemTitleInput
} from "./system-title.types";

export interface SystemTitleCommandContract {
  createSystemTitle(input: CreateSystemTitleInput, ctx: RequestContext): Promise<SystemTitleEntity>;
  updateSystemTitle(titleId: string, input: UpdateSystemTitleInput, ctx: RequestContext): Promise<SystemTitleEntity>;
  deleteSystemTitle(titleId: string, ctx: RequestContext): Promise<void>;
}

export interface SystemTitleQueryContract {
  listSystemTitles(query: ListSystemTitlesQuery, ctx: RequestContext): Promise<SystemTitleEntity[]>;
  getSystemTitleByCode(code: string): SystemTitleEntity | null;
}
