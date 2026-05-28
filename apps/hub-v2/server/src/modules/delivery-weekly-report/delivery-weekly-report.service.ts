import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { ProjectRepo } from "../project/project.repo";
import type {
  DeliveryWeeklyReportCommandContract,
  DeliveryWeeklyReportQueryContract
} from "./delivery-weekly-report.contract";
import { DeliveryWeeklyReportRepo } from "./delivery-weekly-report.repo";
import type {
  DeliveryWeeklyReportEntity,
  DeliveryWeeklyReportListResult,
  DeliveryWeeklyReportSnapshotPayload,
  ListDeliveryWeeklyReportsQuery
} from "./delivery-weekly-report.types";

export class DeliveryWeeklyReportService
  implements DeliveryWeeklyReportCommandContract, DeliveryWeeklyReportQueryContract
{
  constructor(
    private readonly repo: DeliveryWeeklyReportRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly projectAccess: ProjectAccessContract
  ) {}

  async create(input: DeliveryWeeklyReportSnapshotPayload, ctx: RequestContext): Promise<DeliveryWeeklyReportEntity> {
    const projectId = input.projectId.trim();
    await this.projectAccess.requireProjectAccess(projectId, ctx, "create delivery weekly report");
    await this.requireReportMaintainer(projectId, ctx, "create delivery weekly report");
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }

    const now = nowIso();
    const entity: DeliveryWeeklyReportEntity = {
      id: genId("dwr"),
      projectId,
      projectKey: project.projectKey,
      projectName: project.name,
      periodStart: input.periodStart.trim(),
      periodEnd: input.periodEnd.trim(),
      title: input.title.trim(),
      summary: input.summary,
      metrics: input.metrics,
      stages: input.stages,
      keyItems: input.keyItems,
      attentions: input.attentions,
      createdById: this.resolveActorId(ctx) ?? ctx.accountId,
      createdByName: ctx.nickname?.trim() || ctx.accountId,
      createdAt: now
    };

    this.repo.create(entity);
    return entity;
  }

  async list(query: ListDeliveryWeeklyReportsQuery, ctx: RequestContext): Promise<DeliveryWeeklyReportListResult> {
    const projectId = query.projectId.trim();
    await this.projectAccess.requireProjectAccess(projectId, ctx, "list delivery weekly reports");
    return this.repo.list({ ...query, projectId });
  }

  async getById(id: string, ctx: RequestContext): Promise<DeliveryWeeklyReportEntity> {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `delivery weekly report not found: ${id}`, 404);
    }
    await this.projectAccess.requireProjectAccess(entity.projectId, ctx, "get delivery weekly report");
    return entity;
  }

  async delete(id: string, ctx: RequestContext): Promise<{ id: string }> {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `delivery weekly report not found: ${id}`, 404);
    }
    await this.projectAccess.requireProjectAccess(entity.projectId, ctx, "delete delivery weekly report");
    await this.requireReportMaintainer(entity.projectId, ctx, "delete delivery weekly report");
    this.repo.deleteById(id);
    return { id };
  }

  private async requireReportMaintainer(projectId: string, ctx: RequestContext, action: string): Promise<void> {
    if (this.hasManagePermission(ctx)) {
      return;
    }
    const actorId = this.resolveActorId(ctx);
    if (!actorId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }
    const member = await this.projectAccess.requireProjectMember(projectId, actorId, `${action} role check`);
    if (member.isOwner || member.roleCode === "project_admin") {
      return;
    }
    throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden: project admin only`, 403);
  }

  private hasManagePermission(ctx: RequestContext): boolean {
    if (ctx.roles.includes("admin")) {
      return true;
    }
    const permissions = new Set(ctx.authScopes ?? []);
    return permissions.has("project.manage") || permissions.has("project.manage.all");
  }

  private resolveActorId(ctx: RequestContext): string | null {
    return ctx.userId?.trim() || ctx.accountId?.trim() || null;
  }
}
