import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { RequestContext } from "../../shared/context/request-context";
import type { ApprovalTemplateCommandContract, ApprovalTemplateQueryContract } from "./approval-template.contract";
import { ApprovalTemplateRepo } from "./approval-template.repo";
import type {
  ApprovalTemplateDetail,
  ApprovalTemplateEntity,
  ApprovalTemplateStageEntity,
  CreateApprovalTemplateInput,
  CreateApprovalTemplateStageInput,
  ListApprovalTemplatesQuery,
  UpdateApprovalTemplateInput
} from "./approval-template.types";

export class ApprovalTemplateService implements ApprovalTemplateCommandContract, ApprovalTemplateQueryContract {
  constructor(private readonly repo: ApprovalTemplateRepo) {}

  async list(query: ListApprovalTemplatesQuery, _ctx: RequestContext) {
    return this.repo.list(query);
  }

  async getById(id: string, _ctx: RequestContext): Promise<ApprovalTemplateDetail> {
    const template = this.repo.findById(id);
    if (!template) {
      throw new AppError(ERROR_CODES.APPROVAL_TEMPLATE_NOT_FOUND, `approval template not found: ${id}`, 404);
    }
    return {
      ...template,
      stages: this.repo.listStages(id)
    };
  }

  async create(input: CreateApprovalTemplateInput, _ctx: RequestContext): Promise<ApprovalTemplateDetail> {
    const code = input.code.trim();
    if (this.repo.findByCode(code)) {
      throw new AppError(ERROR_CODES.APPROVAL_TEMPLATE_EXISTS, `approval template already exists: ${code}`, 409);
    }

    const now = nowIso();
    const entity: ApprovalTemplateEntity = {
      id: genId("apt"),
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "active",
      createdAt: now,
      updatedAt: now
    };
    const stages = this.normalizeStages(entity.id, input.stages, now);
    this.repo.createTemplate(entity);
    this.repo.replaceStages(entity.id, stages);
    return {
      ...entity,
      stages
    };
  }

  async update(id: string, input: UpdateApprovalTemplateInput, _ctx: RequestContext): Promise<ApprovalTemplateDetail> {
    const current = this.repo.findById(id);
    if (!current) {
      throw new AppError(ERROR_CODES.APPROVAL_TEMPLATE_NOT_FOUND, `approval template not found: ${id}`, 404);
    }

    const nextCode = input.code?.trim() ?? current.code;
    const sameCode = this.repo.findByCode(nextCode);
    if (sameCode && sameCode.id !== current.id) {
      throw new AppError(ERROR_CODES.APPROVAL_TEMPLATE_EXISTS, `approval template already exists: ${nextCode}`, 409);
    }

    const updatedAt = nowIso();
    const entity: ApprovalTemplateEntity = {
      ...current,
      code: nextCode,
      name: input.name?.trim() ?? current.name,
      description: input.description === undefined ? current.description : input.description?.trim() || null,
      status: input.status ?? current.status,
      updatedAt
    };
    this.repo.updateTemplate(entity);
    if (input.stages) {
      this.repo.replaceStages(id, this.normalizeStages(id, input.stages, updatedAt));
    }
    return this.getById(id, _ctx);
  }

  private normalizeStages(templateId: string, inputs: CreateApprovalTemplateStageInput[], timestamp: string): ApprovalTemplateStageEntity[] {
    const seen = new Set<string>();
    return inputs.map((input, index) => {
      const stageCode = input.stageCode.trim();
      if (seen.has(stageCode)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `duplicate stage code: ${stageCode}`, 400);
      }
      seen.add(stageCode);
      const resolverRef = input.resolverRef?.trim() || null;
      if (input.resolverType === "system_role") {
        if (!resolverRef || !this.repo.roleExists(resolverRef)) {
          throw new AppError(ERROR_CODES.SYSTEM_ROLE_NOT_FOUND, `system role not found: ${resolverRef ?? ""}`, 404);
        }
      }
      return {
        id: genId("aps"),
        templateId,
        stageCode,
        stageName: input.stageName.trim(),
        stageType: input.stageType,
        resolverType: input.resolverType,
        resolverRef,
        sort: input.sort ?? index,
        createdAt: timestamp,
        updatedAt: timestamp
      };
    });
  }
}
