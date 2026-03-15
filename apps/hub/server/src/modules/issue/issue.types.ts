import type { IssueAttachmentEntity } from "../issue-attachment/attachment.types";
import type { IssueCommentEntity } from "../issue-comment/comment.types";
import type { IssueActionLogEntity } from "../issue-log/issue-log.types";
import type { IssueParticipantEntity } from "../issue-participant/participant.types";

export type IssueType = "bug" | "feature" | "change" | "improvement" | "task" | "test";
export type IssueStatus = "open" | "in_progress" | "resolved" | "verified" | "closed" | "reopened";
export type IssuePriority = "low" | "medium" | "high" | "critical";
export type IssueActionType =
  | "create"
  | "edit"
  | "assign"
  | "claim"
  | "reassign"
  | "start"
  | "resolve"
  | "verify"
  | "reopen"
  | "close"
  | "add_participant"
  | "remove_participant"
  | "comment_add"
  | "attachment_add"
  | "attachment_remove";

export interface IssueEntity {
  id: string;
  projectId: string;
  issueNo: string;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  reporterId: string;
  reporterName: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  reopenCount: number;
  moduleCode?: string | null;
  versionCode?: string | null;
  environmentCode?: string | null;
  resolutionSummary?: string | null;
  closeReason?: string | null;
  closeRemark?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueDetailResult {
  issue: IssueEntity;
  participants: IssueParticipantEntity[];
  comments: IssueCommentEntity[];
  attachments: IssueAttachmentEntity[];
  actionLogs: IssueActionLogEntity[];
}

export interface ListIssuesQuery {
  projectId: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  type?: IssueType;
  assigneeId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface IssueListResult {
  items: IssueEntity[];
  page: number;
  pageSize: number;
  total: number;
}

export interface OperatorInput {
  operatorId?: string | null;
  operatorName?: string | null;
}

export interface CreateIssueInput extends OperatorInput {
  projectId: string;
  title: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  assigneeId?: string | null;
  moduleCode?: string | null;
  versionCode?: string | null;
  environmentCode?: string | null;
}

export interface UpdateIssueInput extends OperatorInput {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  moduleCode?: string | null;
  versionCode?: string | null;
  environmentCode?: string | null;
}

export interface AssignIssueInput extends OperatorInput {
  assigneeId: string;
}

export interface ClaimIssueInput extends OperatorInput {}

export interface ReassignIssueInput extends OperatorInput {
  assigneeId: string;
}

export interface StartIssueInput extends OperatorInput {
  comment?: string;
}

export interface ResolveIssueInput extends OperatorInput {
  comment?: string;
}

export interface VerifyIssueInput extends OperatorInput {
  comment?: string;
}

export interface ReopenIssueInput extends OperatorInput {
  comment?: string;
}

export interface CloseIssueInput extends OperatorInput {
  closeReason?: string;
}

export type UpdateIssuePatch = Partial<{
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  assigneeId: string | null;
  assigneeName: string | null;
  moduleCode: string | null;
  versionCode: string | null;
  environmentCode: string | null;
  resolutionSummary: string | null;
  closeReason: string | null;
  closeRemark: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  status: IssueStatus;
  reopenCount: number;
  updatedAt: string;
}>;
