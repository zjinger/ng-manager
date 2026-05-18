import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { SystemTitleCommandContract, SystemTitleQueryContract } from "./system-title.contract";
import { SystemTitleRepo } from "./system-title.repo";
import type {
  CreateSystemTitleInput,
  ListSystemTitlesQuery,
  SystemTitleEntity,
  UpdateSystemTitleInput
} from "./system-title.types";

export class SystemTitleService implements SystemTitleCommandContract, SystemTitleQueryContract {
  constructor(private readonly repo: SystemTitleRepo) {}

  async listSystemTitles(query: ListSystemTitlesQuery, _ctx: RequestContext): Promise<SystemTitleEntity[]> {
    return this.repo.listTitles(query);
  }

  getSystemTitleByCode(code: string): SystemTitleEntity | null {
    return this.repo.findByCode(code.trim());
  }

  async createSystemTitle(input: CreateSystemTitleInput, _ctx: RequestContext): Promise<SystemTitleEntity> {
    const code = input.code.trim();
    if (this.repo.findByCode(code)) {
      throw new AppError(ERROR_CODES.SYSTEM_TITLE_EXISTS, `system title already exists: ${code}`, 409);
    }
    const now = nowIso();
    const entity: SystemTitleEntity = {
      id: genId("title"),
      code,
      name: input.name.trim(),
      status: input.status ?? "active",
      sort: input.sort ?? 0,
      remark: input.remark?.trim() || null,
      createdAt: now,
      updatedAt: now
    };
    this.repo.create(entity);
    return entity;
  }

  async updateSystemTitle(titleId: string, input: UpdateSystemTitleInput, _ctx: RequestContext): Promise<SystemTitleEntity> {
    const current = this.repo.findById(titleId);
    if (!current) {
      throw new AppError(ERROR_CODES.SYSTEM_TITLE_NOT_FOUND, `system title not found: ${titleId}`, 404);
    }
    const nextCode = input.code?.trim() ?? current.code;
    const duplicated = this.repo.findByCode(nextCode);
    if (duplicated && duplicated.id !== current.id) {
      throw new AppError(ERROR_CODES.SYSTEM_TITLE_EXISTS, `system title already exists: ${nextCode}`, 409);
    }
    const entity: SystemTitleEntity = {
      ...current,
      code: nextCode,
      name: input.name?.trim() ?? current.name,
      status: input.status ?? current.status,
      sort: input.sort ?? current.sort,
      remark: input.remark === undefined ? current.remark : input.remark?.trim() || null,
      updatedAt: nowIso()
    };
    this.repo.update(entity);
    return entity;
  }

  async deleteSystemTitle(titleId: string, _ctx: RequestContext): Promise<void> {
    const current = this.repo.findById(titleId);
    if (!current) {
      throw new AppError(ERROR_CODES.SYSTEM_TITLE_NOT_FOUND, `system title not found: ${titleId}`, 404);
    }
    if (this.repo.countUsersByTitleCode(current.code) > 0 || this.repo.countDepartmentBindingsByTitleCode(current.code) > 0) {
      throw new AppError(ERROR_CODES.SYSTEM_TITLE_IN_USE, `system title is in use: ${current.code}`, 409);
    }
    this.repo.delete(titleId);
  }
}
