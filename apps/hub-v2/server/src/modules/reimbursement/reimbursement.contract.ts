import type { RequestContext } from "../../shared/context/request-context";
import type {
  AttachReimbursementUploadInput,
  CreateReimbursementClaimInput,
  ListReimbursementClaimsQuery,
  ReimbursementActionInput,
  ReimbursementClaimDetail,
  ReimbursementExportFile,
  ReimbursementClaimListResult,
  ReimbursementDashboard,
  ReimbursementStats,
  ReimbursementStatsQuery,
  ReimbursementTransferInput,
  UpdateReimbursementClaimInput
} from "./reimbursement.types";

export interface ReimbursementCommandContract {
  create(input: CreateReimbursementClaimInput, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  update(id: string, input: UpdateReimbursementClaimInput, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  submit(id: string, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  approve(id: string, input: ReimbursementActionInput, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  reject(id: string, input: ReimbursementActionInput, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  transfer(id: string, input: ReimbursementTransferInput, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  addSign(id: string, input: ReimbursementTransferInput, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  attach(id: string, input: AttachReimbursementUploadInput, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  detach(id: string, attachmentId: string, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
}

export interface ReimbursementQueryContract {
  dashboard(ctx: RequestContext): Promise<ReimbursementDashboard>;
  list(query: ListReimbursementClaimsQuery, ctx: RequestContext): Promise<ReimbursementClaimListResult>;
  getById(id: string, ctx: RequestContext): Promise<ReimbursementClaimDetail>;
  exportWord(id: string, ctx: RequestContext): Promise<ReimbursementExportFile>;
  stats(query: ReimbursementStatsQuery, ctx: RequestContext): Promise<ReimbursementStats>;
}
