import type { RequestContext } from "../../shared/context/request-context";
import type {
  BlockRdItemInput,
  CreateRdItemInput,
  CreateRdStageInput,
  ListRdItemsQuery,
  ListRdStagesQuery,
  RdItemEntity,
  RdDashboardTodo,
  RdItemListResult,
  RdLogEntity,
  RdStageEntity,
  UpdateRdItemInput,
  UpdateRdStageInput
} from "./rd.types";

export interface RdCommandContract {
  createStage(input: CreateRdStageInput, ctx: RequestContext): Promise<RdStageEntity>;
  updateStage(id: string, input: UpdateRdStageInput, ctx: RequestContext): Promise<RdStageEntity>;
  createItem(input: CreateRdItemInput, ctx: RequestContext): Promise<RdItemEntity>;
  updateItem(id: string, input: UpdateRdItemInput, ctx: RequestContext): Promise<RdItemEntity>;
  start(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  block(id: string, input: BlockRdItemInput, ctx: RequestContext): Promise<RdItemEntity>;
  resume(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  complete(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  accept(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  close(id: string, ctx: RequestContext): Promise<RdItemEntity>;
}

export interface RdQueryContract {
  listStages(query: ListRdStagesQuery, ctx: RequestContext): Promise<RdStageEntity[]>;
  listItems(query: ListRdItemsQuery, ctx: RequestContext): Promise<RdItemListResult>;
  getItemById(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  listLogs(id: string, ctx: RequestContext): Promise<RdLogEntity[]>;
  countAssignedForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number>;
  countReviewingForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number>;
  listTodosForDashboard(projectIds: string[], userId: string, limit: number, ctx: RequestContext): Promise<RdDashboardTodo[]>;
}
