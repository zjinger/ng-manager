import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateProjectApiTokenInput,
  CreateProjectApiTokenResult,
  ListProjectApiTokensResult,
  TokenFeedbackDetail,
  TokenFeedbackListQuery,
  TokenFeedbackListResult,
  TokenIssueDetail,
  TokenIssueAttachmentsResult,
  TokenIssueCommentsResult,
  TokenIssueListQuery,
  TokenIssueListResult,
  TokenIssueLogsResult,
  TokenIssueParticipantsResult,
  TokenProjectMembersResult,
  TokenRdDetail,
  TokenRdListQuery,
  TokenRdListResult,
  TokenRdLogsResult,
  TokenRdStagesResult,
  VerifyApiTokenResult
} from "./api-token.types";

export interface ApiTokenCommandContract {
  createProjectToken(input: CreateProjectApiTokenInput, ctx: RequestContext): Promise<CreateProjectApiTokenResult>;
  revokeProjectToken(projectKey: string, tokenId: string, ctx: RequestContext): Promise<void>;
}

export interface ApiTokenQueryContract {
  listProjectTokens(projectKey: string, ctx: RequestContext): Promise<ListProjectApiTokensResult>;
  verifyToken(rawToken: string): Promise<VerifyApiTokenResult | null>;
  listIssues(projectKey: string, query: TokenIssueListQuery, ctx: RequestContext): Promise<TokenIssueListResult>;
  getIssueById(projectKey: string, issueId: string, ctx: RequestContext): Promise<TokenIssueDetail>;
  listIssueLogs(projectKey: string, issueId: string, ctx: RequestContext): Promise<TokenIssueLogsResult>;
  listIssueComments(projectKey: string, issueId: string, ctx: RequestContext): Promise<TokenIssueCommentsResult>;
  listIssueParticipants(projectKey: string, issueId: string, ctx: RequestContext): Promise<TokenIssueParticipantsResult>;
  listIssueAttachments(projectKey: string, issueId: string, ctx: RequestContext): Promise<TokenIssueAttachmentsResult>;
  listProjectMembers(projectKey: string, ctx: RequestContext): Promise<TokenProjectMembersResult>;
  listRdStages(projectKey: string, ctx: RequestContext): Promise<TokenRdStagesResult>;
  listRdItems(projectKey: string, query: TokenRdListQuery, ctx: RequestContext): Promise<TokenRdListResult>;
  getRdItemById(projectKey: string, itemId: string, ctx: RequestContext): Promise<TokenRdDetail>;
  listRdLogs(projectKey: string, itemId: string, ctx: RequestContext): Promise<TokenRdLogsResult>;
  listFeedbacks(projectKey: string, query: TokenFeedbackListQuery, ctx: RequestContext): Promise<TokenFeedbackListResult>;
  getFeedbackById(projectKey: string, feedbackId: string, ctx: RequestContext): Promise<TokenFeedbackDetail>;
}
