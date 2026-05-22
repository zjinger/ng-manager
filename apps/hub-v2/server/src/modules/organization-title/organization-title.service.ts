import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { AuditLogCommandContract } from "../audit-log/audit-log.contract";
import type { OrganizationTitleCommandContract, OrganizationTitleQueryContract } from "./organization-title.contract";
import { OrganizationTitleRepo } from "./organization-title.repo";
import type {
  CreateOrganizationTitleInput,
  ListOrganizationTitlesQuery,
  OrganizationTitleEntity,
  UpdateOrganizationTitleInput
} from "./organization-title.types";

export class OrganizationTitleService implements OrganizationTitleCommandContract, OrganizationTitleQueryContract {
  constructor(
    private readonly repo: OrganizationTitleRepo,
    private readonly auditLog?: AuditLogCommandContract
  ) {}

  async listOrganizationTitles(query: ListOrganizationTitlesQuery, _ctx: RequestContext): Promise<OrganizationTitleEntity[]> {
    return this.repo.listTitles(query);
  }

  getOrganizationTitleByCode(code: string): OrganizationTitleEntity | null {
    return this.repo.findByCode(code.trim());
  }

  async createOrganizationTitle(input: CreateOrganizationTitleInput, ctx: RequestContext): Promise<OrganizationTitleEntity> {
    const code = input.code.trim();
    if (this.repo.findByCode(code)) {
      throw new AppError(ERROR_CODES.ORGANIZATION_TITLE_EXISTS, `organization title already exists: ${code}`, 409);
    }
    const now = nowIso();
    const entity: OrganizationTitleEntity = {
      id: genId("otitle"),
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
        module: "organization",
        action: "create",
        targetType: "organization_title",
        targetId: entity.id,
        targetName: entity.name,
        summary: `创建组织职务「${entity.name}」`,
        after: entity
      },
      ctx
    );
    return entity;
  }

  async updateOrganizationTitle(titleId: string, input: UpdateOrganizationTitleInput, ctx: RequestContext): Promise<OrganizationTitleEntity> {
    const current = this.repo.findById(titleId);
    if (!current) {
      throw new AppError(ERROR_CODES.ORGANIZATION_TITLE_NOT_FOUND, `organization title not found: ${titleId}`, 404);
    }
    const nextCode = input.code?.trim() ?? current.code;
    const duplicated = this.repo.findByCode(nextCode);
    if (duplicated && duplicated.id !== current.id) {
      throw new AppError(ERROR_CODES.ORGANIZATION_TITLE_EXISTS, `organization title already exists: ${nextCode}`, 409);
    }
    const entity: OrganizationTitleEntity = {
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
        module: "organization",
        action: "update",
        targetType: "organization_title",
        targetId: entity.id,
        targetName: entity.name,
        summary: `更新组织职务「${entity.name}」`,
        before: current,
        after: entity
      },
      ctx
    );
    return entity;
  }

  async deleteOrganizationTitle(titleId: string, ctx: RequestContext): Promise<void> {
    const current = this.repo.findById(titleId);
    if (!current) {
      throw new AppError(ERROR_CODES.ORGANIZATION_TITLE_NOT_FOUND, `organization title not found: ${titleId}`, 404);
    }
    if (this.repo.countUsersByTitleCode(current.code) > 0 || this.repo.countDepartmentBindingsByTitleCode(current.code) > 0) {
      throw new AppError(ERROR_CODES.ORGANIZATION_TITLE_IN_USE, `organization title is in use: ${current.code}`, 409);
    }
    this.repo.delete(titleId);
    this.auditLog?.record(
      {
        module: "organization",
        action: "delete",
        targetType: "organization_title",
        targetId: current.id,
        targetName: current.name,
        summary: `删除组织职务「${current.name}」`,
        before: current
      },
      ctx
    );
  }
}
