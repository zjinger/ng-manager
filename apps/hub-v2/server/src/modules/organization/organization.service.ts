import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { AuditLogCommandContract } from "../audit-log/audit-log.contract";
import type { OrganizationCommandContract, OrganizationQueryContract } from "./organization.contract";
import { OrganizationRepo } from "./organization.repo";
import type {
  CreateDepartmentInput,
  DepartmentEntity,
  DepartmentTitleEntity,
  DepartmentTitleInput,
  DepartmentTreeNode,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
  UserDepartmentEntity,
  UserDepartmentInput
} from "./organization.types";

export class OrganizationService implements OrganizationCommandContract, OrganizationQueryContract {
  constructor(
    private readonly repo: OrganizationRepo,
    private readonly auditLog?: AuditLogCommandContract
  ) {}

  async listDepartments(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentEntity[]> {
    this.requireReadable(ctx);
    if (this.canManageDepartments(ctx)) {
      return this.repo.listDepartments(query);
    }
    const assigned = this.repo.listUserDepartments(ctx.userId ?? "");
    return assigned
      .map((item) => this.repo.findDepartmentById(item.departmentId))
      .filter((item): item is DepartmentEntity => !!item && item.status === "active");
  }

  async listAllDepartments(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentEntity[]> {
    this.requireReadable(ctx);
    return this.repo.listDepartments(query);
  }

  async listDepartmentTree(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentTreeNode[]> {
    const departments = await this.listDepartments(query, ctx);
    return this.buildTree(departments);
  }

  async listDepartmentTitles(departmentId: string, ctx: RequestContext): Promise<DepartmentTitleEntity[]> {
    const department = this.repo.findDepartmentById(departmentId);
    if (!department) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_NOT_FOUND, `department not found: ${departmentId}`, 404);
    }
    this.requireDepartmentReadable(departmentId, ctx);
    return this.repo.listDepartmentTitles(departmentId);
  }

  async createDepartment(input: CreateDepartmentInput, _ctx: RequestContext): Promise<DepartmentEntity> {
    const code = input.code.trim();
    if (this.repo.findDepartmentByCode(code)) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_EXISTS, `department already exists: ${code}`, 409);
    }
    const parentId = input.parentId?.trim() || null;
    if (parentId && !this.repo.findDepartmentById(parentId)) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_PARENT_INVALID, "department parent invalid", 400);
    }
    const managerUserId = input.managerUserId?.trim() || null;
    if (managerUserId) {
      this.ensureUser(managerUserId);
    }

    const now = nowIso();
    const entity: DepartmentEntity = {
      id: genId("dep"),
      parentId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      externalFinanceCode: input.externalFinanceCode?.trim() || null,
      managerUserId,
      managerUser: null,
      status: input.status ?? "active",
      sort: input.sort ?? 0,
      createdAt: now,
      updatedAt: now
    };
    this.repo.createDepartment(entity);
    this.auditLog?.record(
      {
        module: "organization",
        action: "create",
        targetType: "department",
        targetId: entity.id,
        targetName: entity.name,
        summary: `创建部门「${entity.name}」`,
        after: entity
      },
      _ctx
    );
    return entity;
  }

  async updateDepartment(id: string, input: UpdateDepartmentInput, _ctx: RequestContext): Promise<DepartmentEntity> {
    const current = this.repo.findDepartmentById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_NOT_FOUND, `department not found: ${id}`, 404);
    }
    const nextCode = input.code?.trim() ?? current.code;
    const sameCode = this.repo.findDepartmentByCode(nextCode);
    if (sameCode && sameCode.id !== current.id) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_EXISTS, `department already exists: ${nextCode}`, 409);
    }
    const parentId = input.parentId === undefined ? current.parentId : input.parentId?.trim() || null;
    if (parentId === current.id || (parentId && this.isDescendant(parentId, current.id))) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_PARENT_INVALID, "department parent invalid", 400);
    }
    if (parentId && !this.repo.findDepartmentById(parentId)) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_PARENT_INVALID, "department parent invalid", 400);
    }
    const managerUserId = input.managerUserId === undefined ? current.managerUserId : input.managerUserId?.trim() || null;
    if (managerUserId) {
      this.ensureUser(managerUserId);
    }

    const entity: DepartmentEntity = {
      ...current,
      parentId,
      code: nextCode,
      name: input.name?.trim() ?? current.name,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      externalFinanceCode: input.externalFinanceCode === undefined ? current.externalFinanceCode : input.externalFinanceCode?.trim() || null,
      managerUserId,
      managerUser: managerUserId === current.managerUserId ? current.managerUser : null,
      status: input.status ?? current.status,
      sort: input.sort ?? current.sort,
      updatedAt: nowIso()
    };
    this.repo.updateDepartment(entity);
    this.auditLog?.record(
      {
        module: "organization",
        action: "update",
        targetType: "department",
        targetId: entity.id,
        targetName: entity.name,
        summary: `更新部门「${entity.name}」`,
        before: current,
        after: entity
      },
      _ctx
    );
    return entity;
  }

  async addDepartmentTitle(departmentId: string, input: DepartmentTitleInput, _ctx: RequestContext): Promise<DepartmentTitleEntity> {
    const department = this.repo.findDepartmentById(departmentId);
    if (!department) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_NOT_FOUND, `department not found: ${departmentId}`, 404);
    }
    const titleCode = input.titleCode.trim();
    if (!this.repo.titleExists(titleCode)) {
      throw new AppError(ERROR_CODES.ORGANIZATION_TITLE_NOT_FOUND, `organization title not found: ${titleCode}`, 404);
    }
    if (this.repo.departmentTitleExists(department.id, titleCode)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `department title already exists: ${titleCode}`, 409);
    }
    const now = nowIso();
    this.repo.addDepartmentTitle(department.id, {
      id: genId("dt"),
      titleCode,
      sort: input.sort ?? 0,
      createdAt: now,
      updatedAt: now
    });
    const item = this.repo.listDepartmentTitles(department.id).find((entry) => entry.titleCode === titleCode)!;
    const titleLabel = item.titleName?.trim() || titleCode;
    this.auditLog?.record(
      {
        module: "organization",
        action: "assign",
        targetType: "department_title",
        targetId: `${department.id}:${titleCode}`,
        targetName: `${department.name} / ${titleLabel}`,
        summary: `为部门「${department.name}」绑定职务「${titleLabel}」`,
        after: item
      },
      _ctx
    );
    return item;
  }

  async removeDepartmentTitle(departmentId: string, titleCode: string, _ctx: RequestContext): Promise<void> {
    const department = this.repo.findDepartmentById(departmentId);
    if (!department) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_NOT_FOUND, `department not found: ${departmentId}`, 404);
    }
    const normalizedTitleCode = titleCode.trim();
    const item = this.repo.listDepartmentTitles(department.id).find((entry) => entry.titleCode === normalizedTitleCode);
    const titleLabel = item?.titleName?.trim() || normalizedTitleCode;
    this.repo.removeDepartmentTitle(department.id, normalizedTitleCode);
    this.auditLog?.record(
      {
        module: "organization",
        action: "remove",
        targetType: "department_title",
        targetId: `${department.id}:${normalizedTitleCode}`,
        targetName: `${department.name} / ${titleLabel}`,
        summary: `移除部门「${department.name}」的职务「${titleLabel}」`,
        before: item ?? { departmentId: department.id, titleCode: normalizedTitleCode }
      },
      _ctx
    );
  }

  async addUserDepartment(userId: string, input: UserDepartmentInput, _ctx: RequestContext): Promise<UserDepartmentEntity> {
    this.ensureUser(userId);
    const user = this.repo.findUserById(userId);
    const userLabel = this.formatUserLabel(user, userId);
    this.normalizeUserDepartmentInputs([input]);
    const department = this.repo.findDepartmentById(input.departmentId);
    if (!department) {
      throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_NOT_FOUND, `department not found: ${input.departmentId}`, 404);
    }
    const now = nowIso();
    this.repo.addUserDepartment(userId, {
      id: genId("ud"),
      departmentId: input.departmentId,
      roleCode: input.roleCode ?? null,
      createdAt: now,
      updatedAt: now
    });
    const item = this.repo.listUserDepartments(userId).find((entry) => entry.departmentId === input.departmentId)!;
    this.auditLog?.record(
      {
        module: "organization",
        action: "assign",
        targetType: "user_department",
        targetId: `${userId}:${input.departmentId}`,
        targetName: `${userLabel} / ${department.name}`,
        summary: `为用户「${userLabel}」绑定部门「${department.name}」`,
        after: item
      },
      _ctx
    );
    return item;
  }

  async removeUserDepartment(userId: string, departmentId: string, _ctx: RequestContext): Promise<void> {
    this.ensureUser(userId);
    const user = this.repo.findUserById(userId);
    const userLabel = this.formatUserLabel(user, userId);
    const department = this.repo.findDepartmentById(departmentId);
    const departmentLabel = department?.name?.trim() || departmentId;
    this.repo.removeUserDepartment(userId, departmentId);
    this.auditLog?.record(
      {
        module: "organization",
        action: "remove",
        targetType: "user_department",
        targetId: `${userId}:${departmentId}`,
        targetName: `${userLabel} / ${departmentLabel}`,
        summary: `移除用户「${userLabel}」的部门「${departmentLabel}」`
      },
      _ctx
    );
  }

  async listUserDepartments(userId: string, ctx: RequestContext): Promise<UserDepartmentEntity[]> {
    if (!this.canManageDepartments(ctx) && ctx.userId !== userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
    this.ensureUser(userId);
    return this.repo.listUserDepartments(userId);
  }

  replaceUserDepartmentsFromUserModule(userId: string, inputs: UserDepartmentInput[] | undefined): void {
    if (inputs === undefined) {
      return;
    }
    this.ensureUser(userId);
    const normalized = this.validateUserDepartmentInputs(inputs);
    const now = nowIso();
    this.repo.replaceUserDepartments(
      userId,
      normalized.map((input) => ({
        ...input,
        id: genId("ud"),
        createdAt: now,
        updatedAt: now
      }))
    );
  }

  listUserDepartmentsForUsers(userIds: string[]): Map<string, UserDepartmentEntity[]> {
    return this.repo.listUserDepartmentsForUsers(userIds);
  }

  validateUserDepartmentInputs(inputs: UserDepartmentInput[] | undefined): UserDepartmentInput[] {
    return this.normalizeUserDepartmentInputs(inputs ?? []);
  }

  private normalizeUserDepartmentInputs(inputs: UserDepartmentInput[]): UserDepartmentInput[] {
    const seen = new Set<string>();
    const normalized: UserDepartmentInput[] = [];
    for (const input of inputs) {
      const departmentId = input.departmentId.trim();
      if (!departmentId || seen.has(departmentId)) {
        continue;
      }
      if (!this.repo.findDepartmentById(departmentId)) {
        throw new AppError(ERROR_CODES.ORGANIZATION_DEPARTMENT_NOT_FOUND, `department not found: ${departmentId}`, 404);
      }
      normalized.push({
        departmentId,
        roleCode: input.roleCode?.trim() || null
      });
      seen.add(departmentId);
    }
    if (normalized.length > 1) {
      throw new AppError(ERROR_CODES.ORGANIZATION_USER_PRIMARY_DEPARTMENT_CONFLICT, "only one department is allowed", 400);
    }
    return normalized;
  }

  private buildTree(departments: DepartmentEntity[]): DepartmentTreeNode[] {
    const nodeMap = new Map<string, DepartmentTreeNode>();
    for (const department of departments) {
      nodeMap.set(department.id, { ...department, children: [] });
    }
    const roots: DepartmentTreeNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  private isDescendant(candidateId: string, parentId: string): boolean {
    let current = this.repo.findDepartmentById(candidateId);
    while (current?.parentId) {
      if (current.parentId === parentId) {
        return true;
      }
      current = this.repo.findDepartmentById(current.parentId);
    }
    return false;
  }

  private ensureUser(userId: string): void {
    if (!this.repo.userExists(userId)) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, `user not found: ${userId}`, 404);
    }
  }

  private requireReadable(ctx: RequestContext): void {
    if (!ctx.userId?.trim() && !this.canManageDepartments(ctx)) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
  }

  private requireDepartmentReadable(departmentId: string, ctx: RequestContext): void {
    if (this.canManageDepartments(ctx)) {
      return;
    }
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
    const assigned = this.repo.listUserDepartments(userId);
    if (!assigned.some((item) => item.departmentId === departmentId)) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "forbidden", 403);
    }
  }

  private canManageDepartments(ctx: RequestContext): boolean {
    return (ctx.authScopes ?? []).includes("admin.departments.manage");
  }

  private formatUserLabel(user: { username: string; displayName: string | null } | null, fallback: string): string {
    return user?.displayName?.trim() || user?.username?.trim() || fallback;
  }
}
