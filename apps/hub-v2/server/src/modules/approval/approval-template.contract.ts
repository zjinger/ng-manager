import type { RequestContext } from "../../shared/context/request-context";
import type {
  ApprovalTemplateDetail,
  CreateApprovalTemplateInput,
  ListApprovalTemplatesQuery,
  UpdateApprovalTemplateInput
} from "./approval-template.types";

export interface ApprovalTemplateCommandContract {
  create(input: CreateApprovalTemplateInput, ctx: RequestContext): Promise<ApprovalTemplateDetail>;
  update(id: string, input: UpdateApprovalTemplateInput, ctx: RequestContext): Promise<ApprovalTemplateDetail>;
}

export interface ApprovalTemplateQueryContract {
  list(query: ListApprovalTemplatesQuery, ctx: RequestContext): Promise<ApprovalTemplateDetail[]>;
  getById(id: string, ctx: RequestContext): Promise<ApprovalTemplateDetail>;
}
