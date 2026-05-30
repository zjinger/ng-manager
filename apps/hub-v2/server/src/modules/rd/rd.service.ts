import type { RequestContext } from "../../shared/context/request-context";
import type { EventBus } from "../../shared/event/event-bus";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { UploadCommandContract } from "../upload/upload.contract";
import type { RdCommandContract, RdQueryContract } from "./rd.contract";
import { RdRepo } from "./rd.repo";
import type {
  AdvanceRdStageInput,
  BlockRdItemInput,
  CloseRdItemInput,
  CompleteRdItemInput,
  CreateRdItemInput,
  CreateRdMemberBlockInput,
  CreateRdStageInput,
  CreateRdStageTaskInput,
  ListRdItemsQuery,
  ListRdStagesQuery,
  RdDashboardActivity,
  RdDashboardTodo,
  RdItemEntity,
  RdItemListResult,
  RdItemProgress,
  RdLogEntity,
  RdMemberBlockEntity,
  RdProgressHistory,
  RdStageEntity,
  RdStageHistoryEntry,
  RdStageTaskEntity,
  ResolveRdMemberBlockInput,
  UpdateRdItemInput,
  UpdateRdItemProgressInput,
  UpdateRdStageInput,
  UpdateRdStageTaskInput
} from "./rd.types";
import { RdActionService } from "./services/rd-action.service";
import { RdDashboardService } from "./services/rd-dashboard.service";
import { RdEventService } from "./services/rd-event.service";
import { RdItemService } from "./services/rd-item.service";
import { RdLogService } from "./services/rd-log.service";
import { RdMemberService } from "./services/rd-member.service";
import { RdPermissionService } from "./services/rd-permission.service";
import { RdProgressService } from "./services/rd-progress.service";
import type { RdServiceContext } from "./services/rd-service-context";
import { RdStageFlowService } from "./services/rd-stage-flow.service";
import { RdStageService } from "./services/rd-stage.service";
import { RdStageTaskService } from "./services/rd-stage-task.service";

export class RdService implements RdCommandContract, RdQueryContract {
  private readonly stage: RdStageService;
  private readonly item: RdItemService;
  private readonly action: RdActionService;
  private readonly stageFlow: RdStageFlowService;
  private readonly dashboard: RdDashboardService;
  private readonly log: RdLogService;
  private readonly progress: RdProgressService;
  private readonly stageTask: RdStageTaskService;

  constructor(
    repo: RdRepo,
    projectAccess: ProjectAccessContract,
    eventBus: EventBus,
    uploadCommand: UploadCommandContract
  ) {
    const context: RdServiceContext = { repo, projectAccess, eventBus, uploadCommand };
    const member = new RdMemberService(context);
    const permission = new RdPermissionService(context, member);
    const log = new RdLogService(context, member);
    const event = new RdEventService(context);
    this.stage = new RdStageService(context, permission);
    this.item = new RdItemService(context, member, permission, log, event);
    this.action = new RdActionService(context, member, permission, log, event);
    this.stageFlow = new RdStageFlowService(context, member, permission, log, event);
    this.dashboard = new RdDashboardService(context);
    this.log = log;
    this.progress = new RdProgressService(context, member, permission, log, event);
    this.stageTask = new RdStageTaskService(context, member, permission, log, event);
  }

  createStage(input: CreateRdStageInput, ctx: RequestContext): Promise<RdStageEntity> {
    return this.stage.createStage(input, ctx);
  }

  updateStage(id: string, input: UpdateRdStageInput, ctx: RequestContext): Promise<RdStageEntity> {
    return this.stage.updateStage(id, input, ctx);
  }

  listStages(query: ListRdStagesQuery, ctx: RequestContext): Promise<RdStageEntity[]> {
    return this.stage.listStages(query, ctx);
  }

  createItem(input: CreateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    return this.item.createItem(input, ctx);
  }

  updateItem(id: string, input: UpdateRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    return this.item.updateItem(id, input, ctx);
  }

  start(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.action.start(id, ctx);
  }

  block(id: string, input: BlockRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    return this.action.block(id, input, ctx);
  }

  resume(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.action.resume(id, ctx);
  }

  reopen(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.action.reopen(id, ctx);
  }

  complete(id: string, ctx: RequestContext, input: CompleteRdItemInput = {}, expectedVersion?: number): Promise<RdItemEntity> {
    return this.action.complete(id, ctx, input, expectedVersion);
  }

  accept(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.action.accept(id, ctx);
  }

  close(id: string, input: CloseRdItemInput, ctx: RequestContext): Promise<RdItemEntity> {
    return this.action.close(id, input, ctx);
  }

  advanceStage(id: string, input: AdvanceRdStageInput, ctx: RequestContext): Promise<RdItemEntity> {
    return this.stageFlow.advanceStage(id, input, ctx);
  }

  listItems(query: ListRdItemsQuery, ctx: RequestContext): Promise<RdItemListResult> {
    return this.item.listItems(query, ctx);
  }

  getItemById(id: string, ctx: RequestContext): Promise<RdItemEntity> {
    return this.item.getItemById(id, ctx);
  }

  listLogs(id: string, ctx: RequestContext): Promise<RdLogEntity[]> {
    return this.log.listLogs(id, ctx);
  }

  countAssignedForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number> {
    return this.dashboard.countAssignedForDashboard(projectIds, userId, ctx);
  }

  countInProgressForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number> {
    return this.dashboard.countInProgressForDashboard(projectIds, userId, ctx);
  }

  countReviewingForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number> {
    return this.dashboard.countReviewingForDashboard(projectIds, userId, ctx);
  }

  listTodosForDashboard(projectIds: string[], userId: string, limit: number, ctx: RequestContext): Promise<RdDashboardTodo[]> {
    return this.dashboard.listTodosForDashboard(projectIds, userId, limit, ctx);
  }

  listActivitiesForDashboard(projectIds: string[], userId: string, limit: number, ctx: RequestContext): Promise<RdDashboardActivity[]> {
    return this.dashboard.listActivitiesForDashboard(projectIds, userId, limit, ctx);
  }

  updateProgress(id: string, input: UpdateRdItemProgressInput, ctx: RequestContext): Promise<RdItemEntity> {
    return this.progress.updateProgress(id, input, ctx);
  }

  createMemberBlock(id: string, input: CreateRdMemberBlockInput, ctx: RequestContext): Promise<RdMemberBlockEntity> {
    return this.progress.createMemberBlock(id, input, ctx);
  }

  resolveMemberBlock(id: string, blockId: string, input: ResolveRdMemberBlockInput, ctx: RequestContext): Promise<RdMemberBlockEntity> {
    return this.progress.resolveMemberBlock(id, blockId, input, ctx);
  }

  listProgress(id: string, ctx: RequestContext): Promise<RdItemProgress[]> {
    return this.progress.listProgress(id, ctx);
  }

  listProgressHistory(id: string, ctx: RequestContext): Promise<RdProgressHistory[]> {
    return this.progress.listProgressHistory(id, ctx);
  }

  listMemberBlocks(id: string, ctx: RequestContext): Promise<RdMemberBlockEntity[]> {
    return this.progress.listMemberBlocks(id, ctx);
  }

  listStageHistory(id: string, ctx: RequestContext): Promise<RdStageHistoryEntry[]> {
    return this.stageTask.listStageHistory(id, ctx);
  }

  listStageTasks(id: string, ctx: RequestContext): Promise<RdStageTaskEntity[]> {
    return this.stageTask.listStageTasks(id, ctx);
  }

  createStageTask(id: string, input: CreateRdStageTaskInput, ctx: RequestContext): Promise<RdStageTaskEntity> {
    return this.stageTask.createStageTask(id, input, ctx);
  }

  updateStageTask(taskId: string, input: UpdateRdStageTaskInput, ctx: RequestContext): Promise<RdStageTaskEntity> {
    return this.stageTask.updateStageTask(taskId, input, ctx);
  }

  cancelStageTask(taskId: string, ctx: RequestContext): Promise<RdStageTaskEntity> {
    return this.stageTask.cancelStageTask(taskId, ctx);
  }
}
