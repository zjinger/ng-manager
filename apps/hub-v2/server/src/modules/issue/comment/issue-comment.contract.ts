import type { RequestContext } from "../../../shared/context/request-context";
import type { CreateIssueCommentInput, IssueCommentEntity } from "./issue-comment.types";

export interface IssueCommentCommandContract {
  create(issueId: string, input: CreateIssueCommentInput, ctx: RequestContext): Promise<IssueCommentEntity>;
}

export interface IssueCommentQueryContract {
  list(issueId: string, ctx: RequestContext): Promise<IssueCommentEntity[]>;
}
