import Database from "better-sqlite3";
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

export class ProjectService {
  constructor(private readonly repo: ProjectRepo) {}

  create(input: CreateProjectInput): ProjectEntity {
    const now = nowIso();

    const entity: ProjectEntity = {
      id: genId("prj"),
      projectKey: input.projectKey.trim(),
      name: input.name.trim(),
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
      this.handleSqliteError(error, input.projectKey);
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

    const patch: UpdateProjectInput & { updatedAt: string } = {
      ...input,
      name: input.name?.trim(),
      description: input.description === null ? null : input.description?.trim(),
      icon: input.icon === null ? null : input.icon?.trim(),
      updatedAt: nowIso()
    };

    const changed = this.repo.update(id, patch);
    if (!changed) {
      throw new AppError("PROJECT_UPDATE_FAILED", "failed to update project", 500);
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

  private handleSqliteError(error: unknown, projectKey?: string): never {
    if (error instanceof AppError) {
      throw error;
    }

    if (
      error instanceof Database.SqliteError &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      throw new AppError(
        "PROJECT_KEY_EXISTS",
        `project key already exists: ${projectKey ?? "unknown"}`,
        409
      );
    }

    throw error;
  }
}