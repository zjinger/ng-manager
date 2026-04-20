import type { IssueEntity, IssueListResult, IssueLogEntity, ListIssuesQuery } from "../issue/issue.types";
import type {
  ListRdItemsQuery,
  RdItemEntity,
  RdItemListResult,
  RdItemProgress,
  RdLogEntity,
  RdProgressHistory,
  RdStageHistoryEntry
} from "../rd/rd.types";
import type { FeedbackEntity, FeedbackListResult, ListFeedbacksQuery } from "../feedback/feedback.types";
import type { IssueCommentEntity } from "../issue/comment/issue-comment.types";
import type { IssueParticipantEntity } from "../issue/participant/issue-participant.types";
import type { IssueAttachmentEntity } from "../issue/attachment/issue-attachment.types";
import type { IssueBranchEntity } from "../issue/branch/issue-branch.types";
import type { ProjectMemberEntity } from "../project/project.types";
import type { RdStageEntity } from "../rd/rd.types";

export type ApiTokenScope = "issues:read" | "rd:read" | "feedbacks:read";
export type ApiTokenStatus = "active" | "revoked";

export interface ProjectApiTokenEntity {
  id: string;
  projectId: string;
  ownerUserId: string;
  name: string;
  tokenPrefix: string;
  scopes: ApiTokenScope[];
  status: ApiTokenStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectApiTokenInput {
  projectKey: string;
  name: string;
  scopes: ApiTokenScope[];
  expiresAt?: string | null;
}

export interface CreateProjectApiTokenResult {
  token: string;
  entity: ProjectApiTokenEntity;
}

export interface VerifyApiTokenResult {
  tokenId: string;
  projectId: string;
  ownerUserId: string;
  scopes: ApiTokenScope[];
}

export type ListProjectApiTokensResult = {
  items: ProjectApiTokenEntity[];
};

export type TokenIssueListQuery = Omit<ListIssuesQuery, "projectId">;
export type TokenRdListQuery = Omit<ListRdItemsQuery, "projectId">;
export type TokenFeedbackListQuery = Omit<ListFeedbacksQuery, "projectId" | "projectKey" | "projectKeys">;

export type TokenIssueListResult = IssueListResult;
export type TokenIssueDetail = IssueEntity;
export type TokenIssueLogsResult = { items: IssueLogEntity[] };
export type TokenIssueCommentsResult = { items: IssueCommentEntity[] };
export type TokenIssueParticipantsResult = { items: IssueParticipantEntity[] };
export type TokenIssueAttachmentsResult = { items: IssueAttachmentEntity[] };
export type TokenIssueBranchesResult = { items: IssueBranchEntity[] };
export type TokenProjectMembersResult = { items: ProjectMemberEntity[] };
export type TokenRdListResult = RdItemListResult;
export type TokenRdDetail = RdItemEntity;
export type TokenRdStagesResult = { items: RdStageEntity[] };
export type TokenRdLogsResult = { items: RdLogEntity[] };
export type TokenRdStageHistoryResult = { items: RdStageHistoryEntry[] };
export type TokenRdProgressResult = { items: RdItemProgress[] };
export type TokenRdProgressHistoryResult = { items: RdProgressHistory[] };
export type TokenFeedbackListResult = FeedbackListResult;
export type TokenFeedbackDetail = FeedbackEntity;
