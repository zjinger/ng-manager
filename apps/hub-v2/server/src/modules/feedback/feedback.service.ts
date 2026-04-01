import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { ProjectRepo } from "../project/project.repo";
import type { FeedbackCommandContract, FeedbackQueryContract } from "./feedback.contract";
import { FeedbackRepo } from "./feedback.repo";
import type {
  CreateFeedbackInput,
  FeedbackEntity,
  FeedbackListResult,
  ListFeedbacksQuery,
  UpdateFeedbackStatusInput
} from "./feedback.types";

export class FeedbackService implements FeedbackCommandContract, FeedbackQueryContract {
  constructor(
    private readonly repo: FeedbackRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly projectAccess: ProjectAccessContract
  ) {}

  async submit(input: CreateFeedbackInput, _ctx: RequestContext): Promise<FeedbackEntity> {
    const now = nowIso();
    this.assertProjectKeyExists(input.projectKey);

    const entity: FeedbackEntity = {
      id: genId("fb"),
      projectKey: input.projectKey?.trim() || null,
      source: input.source,
      category: input.category,
      title: input.title.trim(),
      content: input.content.trim(),
      contact: input.contact?.trim() || null,
      clientName: input.clientName?.trim() || null,
      clientVersion: input.clientVersion?.trim() || null,
      clientIp: input.clientIp?.trim() || null,
      osInfo: input.osInfo?.trim() || null,
      status: "open",
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    return entity;
  }

  async list(query: ListFeedbacksQuery, ctx: RequestContext): Promise<FeedbackListResult> {
    const accessibleProjectKeys = await this.listAccessibleProjectKeys(ctx);

    if (query.projectId?.trim()) {
      const project = this.assertProjectIdExists(query.projectId.trim());
      if (!project) {
        throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${query.projectId}`, 400);
      }
      if (!accessibleProjectKeys.includes(project.projectKey)) {
        throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "list feedbacks forbidden", 403);
      }
      return this.repo.list({ ...query, projectId: undefined, projectKey: project.projectKey });
    }

    if (query.projectKey?.trim()) {
      const project = this.assertProjectKeyExists(query.projectKey.trim());
      if (!project) {
        throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${query.projectKey}`, 400);
      }
      if (!accessibleProjectKeys.includes(project.projectKey)) {
        throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "list feedbacks forbidden", 403);
      }
      return this.repo.list({ ...query, projectKey: project.projectKey });
    }

    if (accessibleProjectKeys.length === 0) {
      return this.repo.list({ ...query, projectKeys: ["__none__"] });
    }
    return this.repo.list({ ...query, projectKeys: accessibleProjectKeys });
  }

  async getById(id: string, ctx: RequestContext): Promise<FeedbackEntity> {
    const feedback = this.repo.findById(id);
    if (!feedback) {
      throw new AppError(ERROR_CODES.FEEDBACK_NOT_FOUND, `feedback not found: ${id}`, 404);
    }
    await this.ensureFeedbackAccess(feedback, ctx, "get feedback");
    return feedback;
  }

  async changeStatus(id: string, input: UpdateFeedbackStatusInput, ctx: RequestContext): Promise<FeedbackEntity> {
    const exists = this.repo.findById(id);
    if (!exists) {
      throw new AppError(ERROR_CODES.FEEDBACK_NOT_FOUND, `feedback not found: ${id}`, 404);
    }
    await this.ensureFeedbackAccess(exists, ctx, "change feedback status");
    await this.ensureFeedbackStatusManagePermission(exists, ctx);

    const updated = this.repo.updateStatus(id, input, nowIso());
    if (!updated) {
      throw new AppError(ERROR_CODES.FEEDBACK_STATUS_UPDATE_FAILED, "failed to update feedback status", 500);
    }

    return (this.repo.findById(id) as FeedbackEntity);
  }

  private assertProjectKeyExists(projectKey?: string | null) {
    if (!projectKey) {
      return null;
    }
    const project = this.projectRepo.findByKey(projectKey.trim());
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectKey}`, 400);
    }
    if (project.status !== "active") {
      throw new AppError(ERROR_CODES.PROJECT_INACTIVE, `project is not active: ${projectKey}`, 400);
    }
    return project;
  }

  private assertProjectIdExists(projectId?: string | null) {
    if (!projectId) {
      return null;
    }
    const project = this.projectRepo.findById(projectId.trim());
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 400);
    }
    if (project.status !== "active") {
      throw new AppError(ERROR_CODES.PROJECT_INACTIVE, `project is not active: ${projectId}`, 400);
    }
    return project;
  }

  private async ensureFeedbackAccess(feedback: FeedbackEntity, ctx: RequestContext, action: string) {
    if (!feedback.projectKey) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }
    const project = this.assertProjectKeyExists(feedback.projectKey);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }
    await this.projectAccess.requireProjectAccess(project.id, ctx, action);
  }

  private async ensureFeedbackStatusManagePermission(feedback: FeedbackEntity, ctx: RequestContext) {
    if (!feedback.projectKey) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "change feedback status forbidden", 403);
    }

    const project = this.assertProjectKeyExists(feedback.projectKey);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "change feedback status forbidden", 403);
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "change feedback status forbidden", 403);
    }

    const member = await this.projectAccess.requireProjectMember(project.id, userId, "change feedback status");
    const canManage = member.isOwner || member.roleCode === "project_admin";
    if (!canManage) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "change feedback status forbidden", 403);
    }
  }

  private async listAccessibleProjectKeys(ctx: RequestContext): Promise<string[]> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    if (projectIds.length === 0) {
      return [];
    }
    const keys = projectIds
      .map((projectId) => this.projectRepo.findById(projectId)?.projectKey ?? null)
      .filter((key): key is string => Boolean(key));
    return Array.from(new Set(keys));
  }
}
