import type { RequestContext } from "../../shared/context/request-context";
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
    if (query.projectId?.trim()) {
      const project = this.assertProjectIdExists(query.projectId.trim());
      if (!project) {
        throw new AppError("PROJECT_NOT_FOUND", `project not found: ${query.projectId}`, 400);
      }
      if (ctx.roles.includes("admin")) {
        return this.repo.list({ ...query, projectId: undefined, projectKey: project.projectKey });
      }
      await this.projectAccess.requireProjectAccess(project.id, ctx, "list feedbacks");
      return this.repo.list({ ...query, projectId: undefined, projectKey: project.projectKey });
    }

    if (ctx.roles.includes("admin")) {
      if (query.projectKey) {
        this.assertProjectKeyExists(query.projectKey);
      }
      return this.repo.list(query);
    }

    if (query.projectKey?.trim()) {
      const project = this.assertProjectKeyExists(query.projectKey.trim());
      if (!project) {
        throw new AppError("PROJECT_NOT_FOUND", `project not found: ${query.projectKey}`, 400);
      }
      await this.projectAccess.requireProjectAccess(project.id, ctx, "list feedbacks");
      return this.repo.list({ ...query, projectKey: project.projectKey });
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    if (projectIds.length === 0) {
      return this.repo.list({ ...query, projectKeys: ["__none__"] });
    }
    const projectKeys = projectIds
      .map((projectId) => this.projectRepo.findById(projectId)?.projectKey ?? null)
      .filter((key): key is string => Boolean(key));

    if (projectKeys.length === 0) {
      return this.repo.list({ ...query, projectKeys: ["__none__"] });
    }

    return this.repo.list({ ...query, projectKeys });
  }

  async getById(id: string, ctx: RequestContext): Promise<FeedbackEntity> {
    const feedback = this.repo.findById(id);
    if (!feedback) {
      throw new AppError("FEEDBACK_NOT_FOUND", `feedback not found: ${id}`, 404);
    }
    await this.ensureFeedbackAccess(feedback, ctx, "get feedback");
    return feedback;
  }

  async changeStatus(id: string, input: UpdateFeedbackStatusInput, ctx: RequestContext): Promise<FeedbackEntity> {
    const exists = this.repo.findById(id);
    if (!exists) {
      throw new AppError("FEEDBACK_NOT_FOUND", `feedback not found: ${id}`, 404);
    }
    await this.ensureFeedbackAccess(exists, ctx, "change feedback status");
    await this.ensureFeedbackStatusManagePermission(exists, ctx);

    const updated = this.repo.updateStatus(id, input, nowIso());
    if (!updated) {
      throw new AppError("FEEDBACK_STATUS_UPDATE_FAILED", "failed to update feedback status", 500);
    }

    return (this.repo.findById(id) as FeedbackEntity);
  }

  private assertProjectKeyExists(projectKey?: string | null) {
    if (!projectKey) {
      return null;
    }
    const project = this.projectRepo.findByKey(projectKey.trim());
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectKey}`, 400);
    }
    if (project.status !== "active") {
      throw new AppError("PROJECT_INACTIVE", `project is not active: ${projectKey}`, 400);
    }
    return project;
  }

  private assertProjectIdExists(projectId?: string | null) {
    if (!projectId) {
      return null;
    }
    const project = this.projectRepo.findById(projectId.trim());
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 400);
    }
    if (project.status !== "active") {
      throw new AppError("PROJECT_INACTIVE", `project is not active: ${projectId}`, 400);
    }
    return project;
  }

  private async ensureFeedbackAccess(feedback: FeedbackEntity, ctx: RequestContext, action: string) {
    if (ctx.roles.includes("admin")) {
      return;
    }

    if (!feedback.projectKey) {
      throw new AppError("PROJECT_ACCESS_DENIED", `${action} forbidden`, 403);
    }
    const project = this.assertProjectKeyExists(feedback.projectKey);
    if (!project) {
      throw new AppError("PROJECT_ACCESS_DENIED", `${action} forbidden`, 403);
    }
    await this.projectAccess.requireProjectAccess(project.id, ctx, action);
  }

  private async ensureFeedbackStatusManagePermission(feedback: FeedbackEntity, ctx: RequestContext) {
    if (ctx.roles.includes("admin")) {
      return;
    }

    if (!feedback.projectKey) {
      throw new AppError("PROJECT_ACCESS_DENIED", "change feedback status forbidden", 403);
    }

    const project = this.assertProjectKeyExists(feedback.projectKey);
    if (!project) {
      throw new AppError("PROJECT_ACCESS_DENIED", "change feedback status forbidden", 403);
    }

    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError("PROJECT_ACCESS_DENIED", "change feedback status forbidden", 403);
    }

    const member = await this.projectAccess.requireProjectMember(project.id, userId, "change feedback status");
    const canManage = member.isOwner || member.roleCode === "project_admin";
    if (!canManage) {
      throw new AppError("PROJECT_ACCESS_DENIED", "change feedback status forbidden", 403);
    }
  }
}
