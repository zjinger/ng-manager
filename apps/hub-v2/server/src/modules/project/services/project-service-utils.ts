import Database from "better-sqlite3";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import { AppError } from "../../../shared/errors/app-error";
import type { ProjectConfigItemEntity, ProjectVersionItemEntity } from "../project.types";

export function trimToNull(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getNextSort(values: number[]): number {
  const maxSort = values.length ? Math.max(...values) : 0;
  return maxSort + 10;
}

export function groupName(value: string | null | undefined): string {
  return trimToNull(value) ?? "未分组";
}

export function findConfigById(items: ProjectConfigItemEntity[], id: string, code: string): ProjectConfigItemEntity {
  const hit = items.find((item) => item.id === id);
  if (!hit) {
    throw new AppError(code, "config item not found", 500);
  }
  return hit;
}

export function findVersionById(items: ProjectVersionItemEntity[], id: string, code: string): ProjectVersionItemEntity {
  const hit = items.find((item) => item.id === id);
  if (!hit) {
    throw new AppError(code, "version item not found", 500);
  }
  return hit;
}

export function handleProjectSqliteError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
    const message = error.message || "";
    if (message.includes("idx_projects_project_no") || message.includes("projects.project_no")) {
      throw new AppError(ERROR_CODES.PROJECT_NO_CONFLICT, "project number already exists", 409);
    }
    if (message.includes("uq_project_module_members_module_user")) {
      throw new AppError(ERROR_CODES.PROJECT_MODULE_MEMBER_EXISTS, "project module member already exists", 409);
    }
    throw new AppError(ERROR_CODES.PROJECT_CONFLICT, "resource already exists", 409);
  }
  throw error;
}
