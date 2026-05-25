import type { RequestContext } from "../../shared/context/request-context";
import type {
  AttachRdTaskSheetUploadInput,
  CloseRdTaskSheetInput,
  CreateRdTaskSheetInput,
  ListRdTaskSheetsQuery,
  RdTaskSheetDetail,
  RdTaskSheetEntity,
  RdTaskSheetListResult,
  ReplyRdTaskSheetInput,
  UpdateRdTaskSheetInput
} from "./rd-task-sheet.types";

export interface RdTaskSheetCommandContract {
  create(input: CreateRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  update(id: string, input: UpdateRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  issue(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  startProcessing(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  reply(id: string, input: ReplyRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  close(id: string, input: CloseRdTaskSheetInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  attach(id: string, input: AttachRdTaskSheetUploadInput, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  detach(id: string, attachmentId: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
}

export interface RdTaskSheetQueryContract {
  list(query: ListRdTaskSheetsQuery, ctx: RequestContext): Promise<RdTaskSheetListResult>;
  getById(id: string, ctx: RequestContext): Promise<RdTaskSheetDetail>;
  getEntityById(id: string, ctx: RequestContext): Promise<RdTaskSheetEntity>;
}
