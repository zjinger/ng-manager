import Database from "better-sqlite3";
import { customAlphabet } from "nanoid";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
  CreateProjectInput,
  CreateProjectMemberInput,
  ListProjectQuery,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberEntity,
  ProjectMemberRole,
  UpdateProjectInput,
  UpdateProjectMemberInput
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

  listMembers(projectId: string): ProjectMemberEntity[] {
    this.getById(projectId);
    return this.repo.listMembers(projectId);
  }

  addMember(projectId: string, input: Omit<CreateProjectMemberInput, "projectId">): ProjectMemberEntity {
    this.getById(projectId);
    const userId = input.userId.trim();
    const displayName = input.displayName.trim();
    const roles = this.normalizeRoles(input.roles);

    if (!userId) {
      throw new AppError("PROJECT_MEMBER_USER_REQUIRED", "userId is required", 400);
    }
    if (!displayName) {
      throw new AppError("PROJECT_MEMBER_NAME_REQUIRED", "displayName is required", 400);
    }
    if (roles.length === 0) {
      throw new AppError("PROJECT_MEMBER_ROLE_REQUIRED", "at least one role is required", 400);
    }

    const now = nowIso();
    const memberId = genId("pm");

    try {
      this.repo.runInTransaction(() => {
        this.repo.createMember({
          id: memberId,
          projectId,
          userId,
          displayName,
          roles,
          createdAt: now,
          updatedAt: now
        });
      });
    } catch (error) {
      if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError("PROJECT_MEMBER_EXISTS", `member already exists in project: ${userId}`, 409);
      }
      throw error;
    }

    return this.requireMember(projectId, memberId);
  }

  updateMember(projectId: string, memberId: string, input: UpdateProjectMemberInput): ProjectMemberEntity {
    this.getById(projectId);
    const existing = this.requireMember(projectId, memberId);

    const nextDisplayName = input.displayName !== undefined ? input.displayName.trim() : undefined;
    const nextRoles = input.roles !== undefined ? this.normalizeRoles(input.roles) : undefined;

    if (nextDisplayName !== undefined && !nextDisplayName) {
      throw new AppError("PROJECT_MEMBER_NAME_REQUIRED", "displayName is required", 400);
    }
    if (nextRoles !== undefined && nextRoles.length === 0) {
      throw new AppError("PROJECT_MEMBER_ROLE_REQUIRED", "at least one role is required", 400);
    }

    const now = nowIso();
    this.repo.runInTransaction(() => {
      const changed = this.repo.updateMember(projectId, memberId, {
        displayName: nextDisplayName,
        updatedAt: now
      });

      if (!changed) {
        throw new AppError("PROJECT_MEMBER_UPDATE_FAILED", "failed to update project member", 500);
      }

      if (nextRoles !== undefined) {
        this.repo.replaceMemberRoles(memberId, nextRoles, now);
      }
    });

    return this.requireMember(projectId, existing.id);
  }

  removeMember(projectId: string, memberId: string): void {
    this.getById(projectId);
    this.requireMember(projectId, memberId);

    const changed = this.repo.deleteMember(projectId, memberId);
    if (!changed) {
      throw new AppError("PROJECT_MEMBER_DELETE_FAILED", "failed to remove project member", 500);
    }
  }

  private requireMember(projectId: string, memberId: string): ProjectMemberEntity {
    const member = this.repo.findMemberById(projectId, memberId);
    if (!member) {
      throw new AppError("PROJECT_MEMBER_NOT_FOUND", `member not found: ${memberId}`, 404);
    }
    return member;
  }

  private normalizeRoles(roles: readonly ProjectMemberRole[]): ProjectMemberRole[] {
    return Array.from(new Set(roles));
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
