import type { RequestContext } from "../../shared/context/request-context";
import type { CreateUploadInput, UploadEntity } from "./upload.types";

export interface UploadCommandContract {
  create(input: CreateUploadInput, ctx: RequestContext): Promise<UploadEntity>;
  promoteIssueMarkdownUploads(uploadIds: string[], issueId: string, ctx: RequestContext): Promise<void>;
}

export interface UploadQueryContract {
  getById(id: string, ctx: RequestContext): Promise<UploadEntity>;
}
