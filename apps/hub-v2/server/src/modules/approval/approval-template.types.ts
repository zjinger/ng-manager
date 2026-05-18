import type { PageResult } from "../../shared/http/pagination";

export type ApprovalTemplateStatus = "active" | "inactive";
export type ApprovalStageType = "direct_manager" | "department_manager" | "finance_review" | "cashier" | "special_authorizer";
export type ApprovalResolverType = "direct_manager" | "department_manager" | "department_chain" | "system_role";

export interface ApprovalTemplateEntity {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ApprovalTemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalTemplateStageEntity {
  id: string;
  templateId: string;
  stageCode: string;
  stageName: string;
  stageType: ApprovalStageType;
  resolverType: ApprovalResolverType;
  resolverRef: string | null;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalTemplateDetail extends ApprovalTemplateEntity {
  stages: ApprovalTemplateStageEntity[];
}

export interface ApprovalTemplateStageInput {
  stageCode: string;
  stageName: string;
  stageType: ApprovalStageType;
  resolverType: ApprovalResolverType;
  resolverRef?: string | null;
  sort?: number;
}

export interface CreateApprovalTemplateInput {
  code: string;
  name: string;
  description?: string | null;
  status?: ApprovalTemplateStatus;
  stages?: ApprovalTemplateStageInput[];
}

export interface UpdateApprovalTemplateInput {
  code?: string;
  name?: string;
  description?: string | null;
  status?: ApprovalTemplateStatus;
  stages?: ApprovalTemplateStageInput[];
}

export interface ListApprovalTemplatesQuery {
  keyword?: string;
  status?: ApprovalTemplateStatus | "";
}

export type ApprovalTemplateListResult = PageResult<ApprovalTemplateDetail>;
