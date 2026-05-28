import type { RequestContext } from "../../../shared/context/request-context";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { AppError } from "../../../shared/errors/app-error";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { ProjectRepo } from "../project.repo";
import { ProjectAccessService } from "../project-access.service";
import type {
  CreateProjectVersionItemInput,
  ProjectVersionItemEntity,
  UpdateProjectVersionItemInput
} from "../project.types";
import { ProjectBaseService } from "./project-base.service";
import { findVersionById, getNextSort, handleProjectSqliteError } from "./project-service-utils";

export class ProjectVersionService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly access: ProjectAccessService,
    private readonly baseService: ProjectBaseService
  ) {}

  async listVersions(projectId: string, ctx: RequestContext): Promise<ProjectVersionItemEntity[]> {
    await this.baseService.getById(projectId, ctx);
    return this.repo.listVersions(projectId);
  }

  async addVersion(projectId: string, input: CreateProjectVersionItemInput, ctx: RequestContext): Promise<ProjectVersionItemEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "add project version");
    await this.baseService.getById(projectId, ctx);
    const now = nowIso();
    const id = genId("pver");

    try {
      this.repo.addVersion(projectId, {
        id,
        version: input.version.trim(),
        code: input.code?.trim(),
        enabled: input.enabled,
        sort: input.sort ?? getNextSort(this.repo.listVersions(projectId).map((item) => item.sort)),
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      handleProjectSqliteError(error);
    }

    return findVersionById(this.repo.listVersions(projectId), id, "PROJECT_VERSION_CREATE_FAILED");
  }

  async updateVersion(
    projectId: string,
    versionId: string,
    input: UpdateProjectVersionItemInput,
    ctx: RequestContext
  ): Promise<ProjectVersionItemEntity> {
    await this.access.requireProjectMaintainer(projectId, ctx, "update project version");
    const changed = this.repo.updateVersion(projectId, versionId, {
      version: input.version?.trim(),
      code: input.code === undefined ? undefined : input.code?.trim() || null,
      enabled: input.enabled,
      sort: input.sort,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError(ERROR_CODES.PROJECT_VERSION_NOT_FOUND, `version not found: ${versionId}`, 404);
    }
    return findVersionById(this.repo.listVersions(projectId), versionId, "PROJECT_VERSION_NOT_FOUND");
  }

  async removeVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<void> {
    await this.access.requireProjectMaintainer(projectId, ctx, "remove project version");
    if (!this.repo.removeVersion(projectId, versionId)) {
      throw new AppError(ERROR_CODES.PROJECT_VERSION_NOT_FOUND, `version not found: ${versionId}`, 404);
    }
  }
}
