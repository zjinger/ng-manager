import type { RequestContext } from "../../shared/context/request-context";
import type { CreateUploadInput, UploadEntity } from "./upload.types";

export interface PromoteMarkdownUploadsInput {
  content: string | null | undefined;
  bucket: string;
  entityId: string;
}

export interface UploadCommandContract {
  create(input: CreateUploadInput, ctx: RequestContext): Promise<UploadEntity>;
  promoteMarkdownUploads(input: PromoteMarkdownUploadsInput, ctx: RequestContext): Promise<void>;
}

export interface UploadQueryContract {
  getById(id: string, ctx: RequestContext): Promise<UploadEntity>;
}
