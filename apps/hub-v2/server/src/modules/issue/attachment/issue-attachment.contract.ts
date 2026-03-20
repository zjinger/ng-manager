import type { RequestContext } from "../../../shared/context/request-context";
import type { CreateIssueAttachmentInput, IssueAttachmentEntity } from "./issue-attachment.types";

export interface IssueAttachmentCommandContract {
  create(issueId: string, input: CreateIssueAttachmentInput, ctx: RequestContext): Promise<IssueAttachmentEntity>;
  remove(issueId: string, attachmentId: string, ctx: RequestContext): Promise<{ ok: true }>;
}

export interface IssueAttachmentQueryContract {
  list(issueId: string, ctx: RequestContext): Promise<IssueAttachmentEntity[]>;
}
