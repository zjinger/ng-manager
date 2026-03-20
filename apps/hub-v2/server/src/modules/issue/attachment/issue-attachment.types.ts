import type { UploadEntity } from "../../upload/upload.types";

export interface IssueAttachmentEntity {
  id: string;
  issueId: string;
  uploadId: string;
  createdAt: string;
  upload: UploadEntity;
}

export interface CreateIssueAttachmentInput {
  uploadId: string;
}
