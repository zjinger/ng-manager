import type Database from "better-sqlite3";
import { customAlphabet } from "nanoid";
import { pinyin } from "pinyin-pro";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import type { RequestContext } from "../../../shared/context/request-context";
import { AppError } from "../../../shared/errors/app-error";
import { genId } from "../../../shared/utils/id";
import { nowIso } from "../../../shared/utils/time";
import { UserRepo } from "../../user/user.repo";
import { RdRepo } from "../../rd/rd.repo";
import { getRdStageTaskTemplate, resolveRdStageKey } from "../../rd/rd-stage-task-templates";
import type { RdStageEntity, RdStageTaskTemplateEntity } from "../../rd/rd.types";
import { ProjectRepo } from "../project.repo";
import { ProjectAccessService } from "../project-access.service";
import { ProjectAuthorizationService } from "../project-authorization.service";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberEntity,
  ProjectType,
  UpdateProjectInput
} from "../project.types";
import { handleProjectSqliteError, trimToNull } from "./project-service-utils";

const projectKeyNanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 24);
const DEFAULT_RD_STAGE_NAMES = ["需求确认", "方案设计", "功能开发", "测试验证", "交付上线", "项目结项"] as const;

export class ProjectBaseService {
  constructor(
    private readonly repo: ProjectRepo,
    private readonly userRepo: UserRepo,
    private readonly rdRepo: RdRepo,
    private readonly access: ProjectAccessService,
    private readonly authorization: ProjectAuthorizationService,
    private readonly db: Database.Database
  ) {}

  async create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    const creatorId = ctx.userId?.trim();
    if (!creatorId || !this.authorization.canCreateProject(ctx)) {
      throw new AppError(ERROR_CODES.PROJECT_CREATE_FORBIDDEN, "create project forbidden", 403);
    }

    const creator = this.userRepo.findById(creatorId);
    if (!creator) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${creatorId}`, 404);
    }

    const projectName = input.name.trim();
    if (!projectName) {
      throw new AppError(ERROR_CODES.PROJECT_NAME_REQUIRED, "project name is required", 400);
    }
    const projectNo = this.resolveProjectNoForCreate(input.projectNo);
    const projectKey = this.generateUniqueProjectKey();

    const now = nowIso();
    const displayCode = this.resolveDisplayCodeForCreate(input.displayCode, projectName, projectKey);
    const typeFields = this.resolveProjectTypeFields(input);
    const entity: ProjectEntity = {
      id: genId("prj"),
      projectKey,
      projectNo,
      displayCode,
      name: projectName,
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
      avatarUploadId: input.avatarUploadId?.trim() || null,
      avatarUrl: input.avatarUploadId?.trim() ? `/api/admin/uploads/${input.avatarUploadId.trim()}/raw` : null,
      projectType: typeFields.projectType,
      contractNo: typeFields.contractNo,
      deliveryDate: typeFields.deliveryDate,
      productLine: typeFields.productLine,
      slaLevel: typeFields.slaLevel,
      status: "active",
      visibility: input.visibility ?? "internal",
      memberCount: 1,
      createdAt: now,
      updatedAt: now
    };

    const creatorMember: ProjectMemberEntity = {
      id: genId("pm"),
      projectId: entity.id,
      userId: creator.id,
      displayName: creator.displayName || creator.username,
      roleCode: "project_admin",
      isOwner: true,
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };

    try {
      this.db.transaction(() => {
        this.repo.create(entity);
        this.repo.createMember(creatorMember);
        const stages = this.buildDefaultRdStages(entity.id, now);
        for (const stage of stages) {
          this.rdRepo.createStage(stage);
        }
        for (const template of this.buildDefaultRdStageTaskTemplates(stages, now)) {
          this.rdRepo.createStageTaskTemplate(template);
        }
      })();
    } catch (error) {
      handleProjectSqliteError(error);
    }

    return entity;
  }

  async update(projectId: string, input: UpdateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    const current = this.repo.findById(projectId);
    if (!current) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }
    const isStatusChanging = input.status !== undefined && input.status !== current.status;
    if (isStatusChanging) {
      await this.access.requireProjectArchiver(projectId, ctx, "archive project");
    } else {
      await this.access.requireProjectMaintainer(projectId, ctx, "update project");
    }

    const patch: UpdateProjectInput & { updatedAt: string } = {
      name: input.name?.trim(),
      projectNo: undefined,
      projectType: undefined,
      displayCode: undefined,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      icon: input.icon === undefined ? undefined : input.icon?.trim() || null,
      avatarUploadId: input.avatarUploadId === undefined ? undefined : input.avatarUploadId?.trim() || null,
      contractNo: undefined,
      deliveryDate: undefined,
      productLine: undefined,
      slaLevel: undefined,
      status: input.status,
      visibility: input.visibility,
      updatedAt: nowIso()
    };

    if (input.displayCode !== undefined) {
      const effectiveName = patch.name?.trim() || current.name;
      patch.displayCode = this.resolveDisplayCodeForUpdate(input.displayCode, effectiveName, projectId, current.projectKey);
    }
    if (input.projectNo !== undefined) {
      patch.projectNo = this.resolveProjectNoForUpdate(input.projectNo, projectId);
    }
    const typeFields = this.resolveProjectTypeFields(input, current);
    patch.projectType = typeFields.projectType;
    patch.contractNo = typeFields.contractNo;
    patch.deliveryDate = typeFields.deliveryDate;
    patch.productLine = typeFields.productLine;
    patch.slaLevel = typeFields.slaLevel;

    try {
      const changed = this.repo.update(projectId, patch);
      if (!changed) {
        throw new AppError(ERROR_CODES.PROJECT_UPDATE_FAILED, "failed to update project", 500);
      }
    } catch (error) {
      handleProjectSqliteError(error);
    }

    const next = this.repo.findById(projectId);
    if (!next) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }
    return next;
  }

  async list(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    if (!this.authorization.canReadAllProjects(ctx)) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "list projects forbidden", 403);
    }
    return this.repo.list(query);
  }

  async listAccessible(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    const userId = ctx.userId?.trim();

    if (!userId) {
      return {
        items: [],
        page: query.page && query.page > 0 ? query.page : 1,
        pageSize: query.pageSize && query.pageSize > 0 ? query.pageSize : 20,
        total: 0
      };
    }

    if (this.authorization.canReadAllProjects(ctx) && query.scope !== "member_only") {
      return this.repo.list(query);
    }

    return this.repo.listAccessibleByUserId(userId, query);
  }

  async getById(projectId: string, ctx: RequestContext): Promise<ProjectEntity> {
    const project = this.repo.findById(projectId);
    if (!project) {
      throw new AppError(ERROR_CODES.PROJECT_NOT_FOUND, `project not found: ${projectId}`, 404);
    }

    await this.access.requireProjectAccess(projectId, ctx, "get project");
    return project;
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
    throw new AppError(ERROR_CODES.PROJECT_KEY_GENERATE_FAILED, "failed to generate unique project key", 500);
  }

  private resolveProjectNoForCreate(value: string): string {
    const projectNo = value.trim();
    if (!projectNo) {
      throw new AppError(ERROR_CODES.PROJECT_NO_REQUIRED, "project number is required", 400);
    }
    if (this.repo.findByProjectNo(projectNo)) {
      throw new AppError(ERROR_CODES.PROJECT_NO_CONFLICT, `项目编号已存在：${projectNo}`, 409);
    }
    return projectNo;
  }

  private resolveProjectNoForUpdate(value: string, projectId: string): string {
    const projectNo = value.trim();
    if (!projectNo) {
      throw new AppError(ERROR_CODES.PROJECT_NO_REQUIRED, "project number is required", 400);
    }
    const hit = this.repo.findByProjectNo(projectNo);
    if (hit && hit.id !== projectId) {
      throw new AppError(ERROR_CODES.PROJECT_NO_CONFLICT, `项目编号已存在：${projectNo}`, 409);
    }
    return projectNo;
  }

  private normalizeDisplayCode(value: string | null | undefined, projectName: string): string | null {
    const explicit = value?.trim().toUpperCase() || "";
    if (explicit) {
      const normalized = explicit.replace(/[^A-Z0-9]/g, "").slice(0, 3);
      if (normalized) {
        return normalized;
      }
    }

    const pinyinAbbr = this.toPinyinAbbr(projectName);
    if (pinyinAbbr) {
      return pinyinAbbr;
    }

    const compactAscii = projectName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (compactAscii.length >= 3) {
      return compactAscii.slice(0, 3);
    }
    if (compactAscii.length > 0) {
      return compactAscii.padEnd(3, "X");
    }

    const hash = this.hashName(projectName);
    return `P${hash.toString(36).toUpperCase().slice(0, 2).padEnd(2, "0")}`;
  }

  private resolveDisplayCodeForCreate(value: string | undefined, projectName: string, projectKey: string): string | null {
    const input = value?.trim() || "";
    if (input) {
      const normalized = this.normalizeDisplayCode(input, projectName);
      if (!normalized) {
        return null;
      }
      if (this.repo.findByDisplayCode(normalized)) {
        throw new AppError(ERROR_CODES.PROJECT_DISPLAY_CODE_CONFLICT, `项目标识已存在：${normalized}`, 409);
      }
      return normalized;
    }
    return this.resolveAutoUniqueDisplayCode(projectName, projectKey);
  }

  private resolveDisplayCodeForUpdate(
    value: string | null | undefined,
    projectName: string,
    projectId: string,
    projectKey: string
  ): string | null {
    if (value === null) {
      return null;
    }
    const input = value?.trim() || "";
    if (input) {
      const normalized = this.normalizeDisplayCode(input, projectName);
      if (!normalized) {
        return null;
      }
      const hit = this.repo.findByDisplayCode(normalized);
      if (hit && hit.id !== projectId) {
        throw new AppError(ERROR_CODES.PROJECT_DISPLAY_CODE_CONFLICT, `项目标识已存在：${normalized}`, 409);
      }
      return normalized;
    }
    return this.resolveAutoUniqueDisplayCode(projectName, projectKey, projectId);
  }

  private resolveAutoUniqueDisplayCode(projectName: string, projectKeySeed: string, excludeProjectId?: string): string | null {
    const base = this.normalizeDisplayCode(undefined, projectName);
    if (!base) {
      return null;
    }
    const candidates = this.buildAutoDisplayCodeCandidates(base, `${projectName}|${projectKeySeed}`);
    for (const candidate of candidates) {
      const hit = this.repo.findByDisplayCode(candidate);
      if (!hit || hit.id === excludeProjectId) {
        return candidate;
      }
    }
    throw new AppError(ERROR_CODES.PROJECT_DISPLAY_CODE_GENERATE_FAILED, "failed to generate unique displayCode", 500);
  }

  private buildAutoDisplayCodeCandidates(base: string, seed: string): string[] {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const normalizedBase = base.slice(0, 3).padEnd(3, "X");
    const hash = this.hashName(seed);
    const seen = new Set<string>();
    const result: string[] = [];

    const push = (value: string) => {
      const candidate = value.slice(0, 3).padEnd(3, "X").toUpperCase();
      if (!seen.has(candidate)) {
        seen.add(candidate);
        result.push(candidate);
      }
    };

    push(normalizedBase);
    push(`${normalizedBase.slice(0, 2)}${chars[hash % chars.length]}`);
    push(`${normalizedBase.slice(0, 1)}${chars[Math.floor(hash / 23) % chars.length]}${chars[Math.floor(hash / 529) % chars.length]}`);

    for (let i = 0; i < chars.length; i += 1) {
      push(`${normalizedBase.slice(0, 2)}${chars[(hash + i) % chars.length]}`);
    }
    for (let i = 0; i < chars.length * chars.length; i += 1) {
      const c1 = chars[(hash + i) % chars.length];
      const c2 = chars[(Math.floor(hash / chars.length) + i) % chars.length];
      push(`${normalizedBase.slice(0, 1)}${c1}${c2}`);
    }

    return result;
  }

  private toPinyinAbbr(projectName: string): string | null {
    if (!/[\u3400-\u9FFF]/.test(projectName)) {
      return null;
    }

    const result = pinyin(projectName, { toneType: "none", type: "array" }) as string[] | string;
    const syllables = Array.isArray(result)
      ? result
      : String(result)
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean);

    const letters = syllables
      .map((item) => item.replace(/[^a-zA-Z]/g, ""))
      .filter(Boolean)
      .map((item) => item[0].toUpperCase());

    if (letters.length === 0) {
      return null;
    }

    return letters.join("").slice(0, 3).padEnd(3, "X");
  }

  private hashName(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  private resolveProjectTypeFields(
    input: Pick<UpdateProjectInput, "projectType" | "contractNo" | "deliveryDate" | "productLine" | "slaLevel">,
    current?: ProjectEntity
  ): {
    projectType: ProjectType;
    contractNo: string | null;
    deliveryDate: string | null;
    productLine: string | null;
    slaLevel: string | null;
  } {
    const projectType = input.projectType ?? current?.projectType;
    if (!projectType) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "项目类型不能为空", 400);
    }

    const contractNo = trimToNull(input.contractNo === undefined ? current?.contractNo : input.contractNo);
    const deliveryDate = trimToNull(input.deliveryDate === undefined ? current?.deliveryDate : input.deliveryDate);
    const productLine = trimToNull(input.productLine === undefined ? current?.productLine : input.productLine);
    const slaLevel = trimToNull(input.slaLevel === undefined ? current?.slaLevel : input.slaLevel);

    if (deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "交付日期格式必须为 yyyy-MM-dd", 400);
    }
    return {
      projectType,
      contractNo,
      deliveryDate,
      productLine: null,
      slaLevel: null
    };
  }

  private buildDefaultRdStages(projectId: string, timestamp: string): RdStageEntity[] {
    return DEFAULT_RD_STAGE_NAMES.map((name, index) => ({
      id: genId("rds"),
      projectId,
      name,
      sort: (index + 1) * 10,
      enabled: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }));
  }

  private buildDefaultRdStageTaskTemplates(stages: RdStageEntity[], timestamp: string): RdStageTaskTemplateEntity[] {
    return stages.flatMap((stage) => {
      const stageKey = resolveRdStageKey(stage);
      return getRdStageTaskTemplate(stageKey).map((title, index) => ({
        id: genId("rdstpl"),
        projectId: stage.projectId,
        stageId: stage.id,
        stageKey,
        title,
        description: null,
        sortOrder: (index + 1) * 10,
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }));
    });
  }
}
