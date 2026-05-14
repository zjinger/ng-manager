import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import { requireAdmin } from "../utils/require-admin";
import type { ApprovalTemplateCommandContract, ApprovalTemplateQueryContract } from "./approval-template.contract";
import { ApprovalTemplateRepo } from "./approval-template.repo";
import type {
  ApprovalTemplateDetail,
  ApprovalTemplateEntity,
  ApprovalTemplateStageEntity,
  ApprovalTemplateStageInput,
  CreateApprovalTemplateInput,
  ListApprovalTemplatesQuery,
  UpdateApprovalTemplateInput
} from "./approval-template.types";

export class ApprovalTemplateService implements ApprovalTemplateCommandContract, ApprovalTemplateQueryContract {
  constructor(private readonly repo: ApprovalTemplateRepo) {}

  async list(query: ListApprovalTemplatesQuery, ctx: RequestContext): Promise<ApprovalTemplateDetail[]> {
    requireAdmin(ctx);
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<ApprovalTemplateDetail> {
    requireAdmin(ctx);
    const template = this.repo.findById(id);
    if (!template) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `approval template not found: ${id}`, 404);
    }
    return template;
  }

  async create(input: CreateApprovalTemplateInput, ctx: RequestContext): Promise<ApprovalTemplateDetail> {
    requireAdmin(ctx);
    const code = input.code.trim();
    if (this.repo.findByCode(code)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `approval template already exists: ${code}`, 409);
    }
    const now = nowIso();
    const template: ApprovalTemplateEntity = {
      id: genId("apv_tpl"),
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "active",
      createdAt: now,
      updatedAt: now
    };
    this.repo.create(template, this.buildStages(template.id, input.stages ?? [], now));
    return this.getById(template.id, ctx);
  }

  async update(id: string, input: UpdateApprovalTemplateInput, ctx: RequestContext): Promise<ApprovalTemplateDetail> {
    requireAdmin(ctx);
    const current = this.repo.findById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `approval template not found: ${id}`, 404);
    }
    const code = input.code?.trim() ?? current.code;
    const sameCode = this.repo.findByCode(code);
    if (sameCode && sameCode.id !== current.id) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `approval template already exists: ${code}`, 409);
    }
    const now = nowIso();
    const template: ApprovalTemplateEntity = {
      ...current,
      code,
      name: input.name?.trim() ?? current.name,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      status: input.status ?? current.status,
      updatedAt: now
    };
    const stages = input.stages === undefined ? undefined : this.buildStages(template.id, input.stages, now);
    this.repo.update(template, stages);
    return this.getById(template.id, ctx);
  }

  private buildStages(templateId: string, inputs: ApprovalTemplateStageInput[], timestamp: string): ApprovalTemplateStageEntity[] {
    const seenCodes = new Set<string>();
    return inputs.map((input, index) => {
      const stageCode = input.stageCode.trim();
      if (seenCodes.has(stageCode)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `duplicate approval stage code: ${stageCode}`, 400);
      }
      seenCodes.add(stageCode);
      const resolverRef = input.resolverRef?.trim() || null;
      if (input.resolverType === "system_role") {
        if (!resolverRef) {
          throw new AppError(ERROR_CODES.BAD_REQUEST, "resolverRef is required for system_role resolver", 400);
        }
        if (!this.repo.systemRoleExists(resolverRef)) {
          throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${resolverRef}`, 404);
        }
      } else if (resolverRef) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "resolverRef is only supported for system_role resolver", 400);
      }
      return {
        id: genId("apv_stg"),
        templateId,
        stageCode,
        stageName: input.stageName.trim(),
        stageType: input.stageType,
        resolverType: input.resolverType,
        resolverRef,
        sort: input.sort ?? (index + 1) * 10,
        createdAt: timestamp,
        updatedAt: timestamp
      };
    });
  }
}
