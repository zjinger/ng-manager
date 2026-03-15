export interface IssueAttachmentEntity {
  id: string;
  issueId: string;
  uploadId: string;
  fileName: string;
  originalName: string;
  mimeType?: string | null;
  fileExt?: string | null;
  fileSize: number;
  storagePath: string;
  storageProvider: "local";
  uploaderId?: string | null;
  uploaderName?: string | null;
  createdAt: string;
}

export interface CreateIssueAttachmentInput {
  projectId: string;
  issueId: string;
  originalName: string;
  mimeType?: string | null;
  fileSize: number;
  tempFilePath: string;
  operatorId?: string | null;
  operatorName?: string | null;
}

export interface RemoveIssueAttachmentInput {
  projectId: string;
  issueId: string;
  attachmentId: string;
  operatorId?: string | null;
  operatorName?: string | null;
}
