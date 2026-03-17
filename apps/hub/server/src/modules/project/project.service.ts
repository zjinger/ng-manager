import Database from "better-sqlite3";
import { customAlphabet } from "nanoid";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
  CreateProjectConfigItemInput,
  CreateProjectInput,
  CreateProjectVersionItemInput,
  ListProjectQuery,
  ProjectConfigItemEntity,
  ProjectEntity,
  ProjectListResult,
  ProjectVersionItemEntity,
  UpdateProjectConfigItemInput,
  UpdateProjectInput,
  UpdateProjectVersionItemInput
} from "./project.types";
import { ProjectMemberRepo } from "./project-member.repo";
import { ProjectRepo } from "./project.repo";

const projectKeyNanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 24);

export class ProjectService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly memberRepo: ProjectMemberRepo
  ) {}

  create(
    input: CreateProjectInput,
    creator?: {
      userId: string;
      displayName?: string | null;
    }
  ): ProjectEntity {
    const now = nowIso();
    const name = input.name.trim();
    this.assertNameUnique(name);

    const projectKey = this.generateUniqueProjectKey();

    const entity: ProjectEntity = {
      id: genId("prj"),
      projectKey,
      name,
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      status: "active",
      visibility: input.visibility ?? "internal",
      createdAt: now,
      updatedAt: now
    };

    const creatorUserId = creator?.userId?.trim();
    if (creator && !creatorUserId) {
      throw new AppError("PROJECT_CREATOR_REQUIRED", "project creator is required", 400);
    }

    try {
      this.repo.runInTransaction(() => {
        this.repo.create(entity);

        if (creatorUserId) {
          this.memberRepo.createMember({
            id: genId("pm"),
            projectId: entity.id,
            userId: creatorUserId,
            displayName: creator?.displayName?.trim() || creatorUserId,
            roles: ["project_admin"],
            createdAt: now,
            updatedAt: now
          });
        }
      });
      return entity;
    } catch (error) {
      this.handleSqliteError(error, projectKey, name);
    }
  }

  getById(id: string): ProjectEntity {
    const item = this.repo.findById(id);
    if (!item) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${id}`, 404);
    }
    return item;
  }

  getByKey(projectKey: string): ProjectEntity {
    const item = this.repo.findByKey(projectKey);
    if (!item) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectKey}`, 404);
    }
    return item;
  }

  getPublicByKey(projectKey: string): ProjectEntity {
    const item = this.repo.findPublicByKey(projectKey);
    if (!item) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectKey}`, 404);
    }
    return item;
  }

  list(query: ListProjectQuery): ProjectListResult {
    return this.repo.list(query);
  }

  listForUser(userId: string, query: ListProjectQuery): ProjectListResult {
    const projectIds = this.memberRepo.listProjectIdsByUserId(userId);
    return this.repo.listByIds(projectIds, query);
  }

  listPublic(): ProjectEntity[] {
    return this.repo.listPublicActive();
  }

  update(id: string, input: UpdateProjectInput): ProjectEntity {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${id}`, 404);
    }

    const name = input.name?.trim();
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      this.assertNameUnique(name, id);
    }

    const patch: UpdateProjectInput & { updatedAt: string } = {
      ...input,
      name,
      description: input.description === null ? null : input.description?.trim(),
      icon: input.icon === null ? null : input.icon?.trim(),
      updatedAt: nowIso()
    };

    try {
      const changed = this.repo.update(id, patch);
      if (!changed) {
        throw new AppError("PROJECT_UPDATE_FAILED", "failed to update project", 500);
      }
    } catch (error) {
      this.handleSqliteError(error, undefined, name);
    }

    return this.getById(id);
  }

  remove(id: string): void {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${id}`, 404);
    }

    const changed = this.repo.remove(id);
    if (!changed) {
      throw new AppError("PROJECT_DELETE_FAILED", "failed to delete project", 500);
    }
  }

  listModules(projectId: string): ProjectConfigItemEntity[] {
    this.getById(projectId);
    return this.repo.listModules(projectId);
  }

  addModule(projectId: string, input: CreateProjectConfigItemInput): ProjectConfigItemEntity {
    return this.addConfigItem(projectId, input, "module");
  }

  updateModule(projectId: string, moduleId: string, input: UpdateProjectConfigItemInput): ProjectConfigItemEntity {
    return this.updateConfigItem(projectId, moduleId, input, "module");
  }

  removeModule(projectId: string, moduleId: string): void {
    this.getById(projectId);
    const changed = this.repo.removeModule(projectId, moduleId);
    if (!changed) {
      throw new AppError("PROJECT_MODULE_NOT_FOUND", `module not found: ${moduleId}`, 404);
    }
  }

  listEnvironments(projectId: string): ProjectConfigItemEntity[] {
    this.getById(projectId);
    return this.repo.listEnvironments(projectId);
  }

  addEnvironment(projectId: string, input: CreateProjectConfigItemInput): ProjectConfigItemEntity {
    return this.addConfigItem(projectId, input, "environment");
  }

  updateEnvironment(projectId: string, environmentId: string, input: UpdateProjectConfigItemInput): ProjectConfigItemEntity {
    return this.updateConfigItem(projectId, environmentId, input, "environment");
  }

  removeEnvironment(projectId: string, environmentId: string): void {
    this.getById(projectId);
    const changed = this.repo.removeEnvironment(projectId, environmentId);
    if (!changed) {
      throw new AppError("PROJECT_ENVIRONMENT_NOT_FOUND", `environment not found: ${environmentId}`, 404);
    }
  }

  listVersions(projectId: string): ProjectVersionItemEntity[] {
    this.getById(projectId);
    return this.repo.listVersions(projectId);
  }

  addVersion(projectId: string, input: CreateProjectVersionItemInput): ProjectVersionItemEntity {
    this.getById(projectId);
    const version = input.version.trim();
    if (!version) {
      throw new AppError("PROJECT_VERSION_REQUIRED", "version is required", 400);
    }

    const now = nowIso();
    const id = genId("pv");

    try {
      this.repo.addVersion(projectId, {
        id,
        version,
        code: input.code?.trim(),
        enabled: input.enabled ?? true,
        sort: input.sort ?? 0,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError("PROJECT_VERSION_EXISTS", `version already exists: ${version}`, 409);
      }
      throw error;
    }

    const list = this.repo.listVersions(projectId);
    const hit = list.find((item) => item.id === id);
    if (!hit) {
      throw new AppError("PROJECT_VERSION_CREATE_FAILED", "failed to create version", 500);
    }

    return hit;
  }

  updateVersion(projectId: string, versionId: string, input: UpdateProjectVersionItemInput): ProjectVersionItemEntity {
    this.getById(projectId);
    const patch: UpdateProjectVersionItemInput & { updatedAt: string } = {
      version: input.version?.trim(),
      code: input.code === undefined ? undefined : input.code?.trim() || null,
      enabled: input.enabled,
      sort: input.sort,
      updatedAt: nowIso()
    };

    try {
      const changed = this.repo.updateVersion(projectId, versionId, patch);
      if (!changed) {
        throw new AppError("PROJECT_VERSION_NOT_FOUND", `version not found: ${versionId}`, 404);
      }
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError("PROJECT_VERSION_EXISTS", "version already exists", 409);
      }
      throw error;
    }

    const list = this.repo.listVersions(projectId);
    const hit = list.find((item) => item.id === versionId);
    if (!hit) {
      throw new AppError("PROJECT_VERSION_NOT_FOUND", `version not found: ${versionId}`, 404);
    }

    return hit;
  }

  removeVersion(projectId: string, versionId: string): void {
    this.getById(projectId);
    const changed = this.repo.removeVersion(projectId, versionId);
    if (!changed) {
      throw new AppError("PROJECT_VERSION_NOT_FOUND", `version not found: ${versionId}`, 404);
    }
  }

  private addConfigItem(
    projectId: string,
    input: CreateProjectConfigItemInput,
    type: "module" | "environment"
  ): ProjectConfigItemEntity {
    this.getById(projectId);
    const name = input.name.trim();
    if (!name) {
      throw new AppError(
        type === "module" ? "PROJECT_MODULE_NAME_REQUIRED" : "PROJECT_ENVIRONMENT_NAME_REQUIRED",
        "name is required",
        400
      );
    }

    const now = nowIso();
    const id = genId(type === "module" ? "pmod" : "penv");
    const payload = {
      id,
      name,
      code: input.code?.trim(),
      enabled: input.enabled ?? true,
      sort: input.sort ?? 0,
      createdAt: now,
      updatedAt: now
    };

    try {
      if (type === "module") {
        this.repo.addModule(projectId, payload);
      } else {
        this.repo.addEnvironment(projectId, payload);
      }
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError(
          type === "module" ? "PROJECT_MODULE_EXISTS" : "PROJECT_ENVIRONMENT_EXISTS",
          `${type} already exists: ${name}`,
          409
        );
      }
      throw error;
    }

    const list = type === "module" ? this.repo.listModules(projectId) : this.repo.listEnvironments(projectId);
    const hit = list.find((item) => item.id === id);
    if (!hit) {
      throw new AppError(
        type === "module" ? "PROJECT_MODULE_CREATE_FAILED" : "PROJECT_ENVIRONMENT_CREATE_FAILED",
        `failed to create ${type}`,
        500
      );
    }
    return hit;
  }

  private updateConfigItem(
    projectId: string,
    itemId: string,
    input: UpdateProjectConfigItemInput,
    type: "module" | "environment"
  ): ProjectConfigItemEntity {
    this.getById(projectId);
    const patch: UpdateProjectConfigItemInput & { updatedAt: string } = {
      name: input.name?.trim(),
      code: input.code === undefined ? undefined : input.code?.trim() || null,
      enabled: input.enabled,
      sort: input.sort,
      updatedAt: nowIso()
    };

    try {
      const changed =
        type === "module"
          ? this.repo.updateModule(projectId, itemId, patch)
          : this.repo.updateEnvironment(projectId, itemId, patch);
      if (!changed) {
        throw new AppError(
          type === "module" ? "PROJECT_MODULE_NOT_FOUND" : "PROJECT_ENVIRONMENT_NOT_FOUND",
          `${type} not found: ${itemId}`,
          404
        );
      }
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError(
          type === "module" ? "PROJECT_MODULE_EXISTS" : "PROJECT_ENVIRONMENT_EXISTS",
          `${type} already exists`,
          409
        );
      }
      throw error;
    }

    const list = type === "module" ? this.repo.listModules(projectId) : this.repo.listEnvironments(projectId);
    const hit = list.find((item) => item.id === itemId);
    if (!hit) {
      throw new AppError(
        type === "module" ? "PROJECT_MODULE_NOT_FOUND" : "PROJECT_ENVIRONMENT_NOT_FOUND",
        `${type} not found: ${itemId}`,
        404
      );
    }

    return hit;
  }

  private assertNameUnique(name: string, excludeId?: string): void {
    const existing = this.repo.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new AppError("PROJECT_NAME_EXISTS", `project name already exists: ${name}`, 409);
    }
  }

  private generateUniqueProjectKey(): string {
    let attempt = 0;
    while (attempt < 20) {
      const candidate = `prj_${projectKeyNanoid()}`;
      if (!this.repo.findByKey(candidate)) {
        return candidate;
      }
      attempt += 1;
    }

    throw new AppError("PROJECT_KEY_GENERATE_FAILED", "failed to generate unique project key", 500);
  }

  private handleSqliteError(error: unknown, projectKey?: string, projectName?: string): never {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      const message = String(error.message || "").toLowerCase();
      if (message.includes("projects.name")) {
        throw new AppError(
          "PROJECT_NAME_EXISTS",
          `project name already exists: ${projectName ?? "unknown"}`,
          409
        );
      }

      throw new AppError(
        "PROJECT_KEY_EXISTS",
        `project key already exists: ${projectKey ?? "unknown"}`,
        409
      );
    }

    throw error;
  }
}
