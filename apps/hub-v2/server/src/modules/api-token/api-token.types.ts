import type { IssueEntity, IssueListResult, IssueLogEntity, ListIssuesQuery } from "../issue/issue.types";
import type { ListRdItemsQuery, RdItemEntity, RdItemListResult, RdLogEntity } from "../rd/rd.types";
import type { FeedbackEntity, FeedbackListResult, ListFeedbacksQuery } from "../feedback/feedback.types";

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
export type TokenRdListResult = RdItemListResult;
export type TokenRdDetail = RdItemEntity;
export type TokenRdLogsResult = { items: RdLogEntity[] };
export type TokenFeedbackListResult = FeedbackListResult;
export type TokenFeedbackDetail = FeedbackEntity;
