import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { AuditLogCommandContract } from "../audit-log/audit-log.contract";
import type { ProjectTitleCommandContract, ProjectTitleQueryContract } from "./project-title.contract";
import { ProjectTitleRepo } from "./project-title.repo";
import type {
  CreateProjectTitleInput,
  ListProjectTitlesQuery,
  ProjectTitleEntity,
  UpdateProjectTitleInput
} from "./project-title.types";

export class ProjectTitleService implements ProjectTitleCommandContract, ProjectTitleQueryContract {
  constructor(
    private readonly repo: ProjectTitleRepo,
    private readonly auditLog?: AuditLogCommandContract
  ) {}

  async listProjectTitles(query: ListProjectTitlesQuery, _ctx: RequestContext): Promise<ProjectTitleEntity[]> {
    return this.repo.listTitles(query);
  }

  getProjectTitleByCode(code: string): ProjectTitleEntity | null {
    return this.repo.findByCode(code.trim());
  }

  async createProjectTitle(input: CreateProjectTitleInput, ctx: RequestContext): Promise<ProjectTitleEntity> {
    const code = input.code.trim();
    if (this.repo.findByCode(code)) {
      throw new AppError(ERROR_CODES.PROJECT_TITLE_EXISTS, `project title already exists: ${code}`, 409);
    }
    const now = nowIso();
    const entity: ProjectTitleEntity = {
      id: genId("ptitle"),
      code,
      name: input.name.trim(),
      status: input.status ?? "active",
      sort: input.sort ?? 0,
      remark: input.remark?.trim() || null,
      createdAt: now,
      updatedAt: now
    };
    this.repo.create(entity);
    this.auditLog?.record(
      {
        module: "title",
        action: "create",
        targetType: "project_title",
        targetId: entity.id,
        targetName: entity.name,
        summary: `创建项目角色「${entity.name}」`,
        after: entity
      },
      ctx
    );
    return entity;
  }

  async updateProjectTitle(titleId: string, input: UpdateProjectTitleInput, ctx: RequestContext): Promise<ProjectTitleEntity> {
    const current = this.repo.findById(titleId);
    if (!current) {
      throw new AppError(ERROR_CODES.PROJECT_TITLE_NOT_FOUND, `project title not found: ${titleId}`, 404);
    }
    const nextCode = input.code?.trim() ?? current.code;
    const duplicated = this.repo.findByCode(nextCode);
    if (duplicated && duplicated.id !== current.id) {
      throw new AppError(ERROR_CODES.PROJECT_TITLE_EXISTS, `project title already exists: ${nextCode}`, 409);
    }
    const entity: ProjectTitleEntity = {
      ...current,
      code: nextCode,
      name: input.name?.trim() ?? current.name,
      status: input.status ?? current.status,
      sort: input.sort ?? current.sort,
      remark: input.remark === undefined ? current.remark : input.remark?.trim() || null,
      updatedAt: nowIso()
    };
    this.repo.update(entity);
    this.auditLog?.record(
      {
        module: "title",
        action: "update",
        targetType: "project_title",
        targetId: entity.id,
        targetName: entity.name,
        summary: `更新项目角色「${entity.name}」`,
        before: current,
        after: entity
      },
      ctx
    );
    return entity;
  }

  async deleteProjectTitle(titleId: string, ctx: RequestContext): Promise<void> {
    const current = this.repo.findById(titleId);
    if (!current) {
      throw new AppError(ERROR_CODES.PROJECT_TITLE_NOT_FOUND, `project title not found: ${titleId}`, 404);
    }
    if (this.repo.countProjectMembersByRoleCode(current.code) > 0) {
      throw new AppError(ERROR_CODES.PROJECT_TITLE_IN_USE, `project title is in use: ${current.code}`, 409);
    }
    if (this.repo.countUsersByDefaultProjectTitleCode(current.code) > 0) {
      throw new AppError(ERROR_CODES.PROJECT_TITLE_IN_USE, `project title is used as user default project title: ${current.code}`, 409);
    }
    this.repo.delete(titleId);
    this.auditLog?.record(
      {
        module: "title",
        action: "delete",
        targetType: "project_title",
        targetId: current.id,
        targetName: current.name,
        summary: `删除项目角色「${current.name}」`,
        before: current
      },
      ctx
    );
  }
}
