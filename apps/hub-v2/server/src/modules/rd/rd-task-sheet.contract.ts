import type { RequestContext } from "../../shared/context/request-context";
import type {
  AttachRdTaskSheetUploadInput,
  AssignRdTaskSheetInput,
  CloseRdTaskSheetInput,
  ConvertRdTaskSheetToIssueInput,
  ConvertRdTaskSheetToRdItemInput,
  CreateRdTaskSheetDefaultRouteInput,
  CreateRdTaskSheetInput,
  ListRdTaskSheetDefaultRoutesQuery,
  ListRdTaskSheetsQuery,
  PreviewRdTaskSheetImportInput,
  PreviewRdTaskSheetImportResult,
  RdTaskSheetDefaultRouteEntity,
  RdTaskSheetDetail,
  RdTaskSheetEntity,
  RdTaskSheetListResult,
  RenderedRdTaskSheetWord,
  ReplyRdTaskSheetInput,
  ReturnReviewRdTaskSheetInput,
  UpdateRdTaskSheetDefaultRouteInput,
  UpdateRdTaskSheetInput
} from "./rd-task-sheet.types";

export interface RdTaskSheetCommandContract {
  create(input: CreateRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  update(id: string, input: UpdateRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  delete(id: string, ctx: RequestContext): Promise<{ id: string }>;
  submitReview(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  approveReview(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  returnReview(id: string, input: ReturnReviewRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  issue(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  assign(id: string, input: AssignRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  startProcessing(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  reply(id: string, input: ReplyRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  close(id: string, input: CloseRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  attach(id: string, input: AttachRdTaskSheetUploadInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  detach(id: string, attachmentId: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  convertToRdItem(id: string, input: ConvertRdTaskSheetToRdItemInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  convertToIssue(id: string, input: ConvertRdTaskSheetToIssueInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  createDefaultRoute(input: CreateRdTaskSheetDefaultRouteInput, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity>;
  updateDefaultRoute(id: string, input: UpdateRdTaskSheetDefaultRouteInput, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity>;
  deleteDefaultRoute(id: string, ctx: RequestContext): Promise<{ id: string }>;
}

export interface RdTaskSheetQueryContract {
  list(query: ListRdTaskSheetsQuery, ctx: RequestContext): Promise<RdTaskSheetListResult>;
  getById(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  getEntityById(id: string, ctx: RequestContext): Promise<RdTaskSheetEntity>;
  previewImport(input: PreviewRdTaskSheetImportInput, ctx: RequestContext): Promise<PreviewRdTaskSheetImportResult>;
  exportWord(id: string, ctx: RequestContext): Promise<RenderedRdTaskSheetWord>;
  listDefaultRoutes(query: ListRdTaskSheetDefaultRoutesQuery, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity[]>;
  getMyDefaultRoute(ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity | null>;
  matchDefaultRoute(issuerUserId: string | undefined, ctx: RequestContext): Promise<RdTaskSheetDefaultRouteEntity | null>;
}
