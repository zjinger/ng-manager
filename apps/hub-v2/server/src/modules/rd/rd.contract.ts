import type { RequestContext } from "../../shared/context/request-context";
import type {
  BlockRdItemInput,
  CloseRdItemInput,
  CompleteRdItemInput,
  AdvanceRdStageInput,
  CreateRdMemberBlockInput,
  CreateRdItemInput,
  CreateRdStageInput,
  ListRdItemsQuery,
  ListRdStagesQuery,
  RdItemEntity,
  RdDashboardTodo,
  RdDashboardActivity,
  RdItemListResult,
  RdItemProgress,
  RdMemberBlockEntity,
  RdProgressHistory,
  RdStageHistoryEntry,
  RdLogEntity,
  RdStageEntity,
  UpdateRdItemInput,
  UpdateRdItemProgressInput,
  ResolveRdMemberBlockInput,
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
  reopen(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  complete(id: string, ctx: RequestContext, input?: CompleteRdItemInput): Promise<RdItemEntity>;
  advanceStage(id: string, input: AdvanceRdStageInput, ctx: RequestContext): Promise<RdItemEntity>;
  accept(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  close(id: string, input: CloseRdItemInput, ctx: RequestContext): Promise<RdItemEntity>;
  updateProgress(id: string, input: UpdateRdItemProgressInput, ctx: RequestContext): Promise<RdItemEntity>;
  createMemberBlock(id: string, input: CreateRdMemberBlockInput, ctx: RequestContext): Promise<RdMemberBlockEntity>;
  resolveMemberBlock(id: string, blockId: string, input: ResolveRdMemberBlockInput, ctx: RequestContext): Promise<RdMemberBlockEntity>;
}

export interface RdQueryContract {
  listStages(query: ListRdStagesQuery, ctx: RequestContext): Promise<RdStageEntity[]>;
  listItems(query: ListRdItemsQuery, ctx: RequestContext): Promise<RdItemListResult>;
  getItemById(id: string, ctx: RequestContext): Promise<RdItemEntity>;
  listLogs(id: string, ctx: RequestContext): Promise<RdLogEntity[]>;
  countAssignedForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number>;
  countInProgressForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number>;
  countReviewingForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number>;
  listTodosForDashboard(projectIds: string[], userId: string, limit: number, ctx: RequestContext): Promise<RdDashboardTodo[]>;
  listActivitiesForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    ctx: RequestContext
  ): Promise<RdDashboardActivity[]>;
  listProgress(id: string, ctx: RequestContext): Promise<RdItemProgress[]>;
  listProgressHistory(id: string, ctx: RequestContext): Promise<RdProgressHistory[]>;
  listMemberBlocks(id: string, ctx: RequestContext): Promise<RdMemberBlockEntity[]>;
  listStageHistory(id: string, ctx: RequestContext): Promise<RdStageHistoryEntry[]>;
}
