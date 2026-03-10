import Database from "better-sqlite3";
import { customAlphabet } from "nanoid";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
  CreateProjectInput,
  ListProjectQuery,
  ProjectEntity,
  ProjectListResult,
  UpdateProjectInput
} from "./project.types";
import { ProjectRepo } from "./project.repo";

const projectKeyNanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 24);

export class ProjectService {
  constructor(private readonly repo: ProjectRepo) {}

  create(input: CreateProjectInput): ProjectEntity {
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

    try {
      this.repo.create(entity);
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
