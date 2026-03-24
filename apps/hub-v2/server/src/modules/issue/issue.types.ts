import type { PageResult } from "../../shared/http/pagination";

export type IssueType = "bug" | "feature" | "change" | "improvement" | "task" | "test";
export type IssuePriority = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in_progress" | "resolved" | "verified" | "closed" | "reopened";
export type IssueAction =
  | "create"
  | "update"
  | "assign"
  | "start"
  | "resolve"
  | "verify"
  | "reopen"
  | "close";

export interface IssueEntity {
  id: string;
  projectId: string;
  issueNo: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  reporterId: string;
  reporterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  verifierId: string | null;
  verifierName: string | null;
  moduleCode: string | null;
  versionCode: string | null;
  environmentCode: string | null;
  resolutionSummary: string | null;
  closeReason: string | null;
  closeRemark: string | null;
  reopenCount: number;
  startedAt: string | null;
  resolvedAt: string | null;
  verifiedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueLogEntity {
  id: string;
  issueId: string;
  actionType: IssueAction;
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus | null;
  operatorId: string | null;
  operatorName: string | null;
  summary: string | null;
  metaJson: string | null;
  createdAt: string;
}

export interface IssueDashboardTodo {
  kind: "issue_assigned" | "issue_verify";
  entityId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
  projectId: string;
}

export interface IssueDashboardActivity {
  kind: "issue_activity";
  entityId: string;
  code: string;
  title: string;
  action: string;
  summary: string | null;
  createdAt: string;
  projectId: string;
}

export interface CreateIssueInput {
  projectId: string;
  title: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  assigneeId?: string | null;
  verifierId?: string | null;
  moduleCode?: string;
  versionCode?: string;
  environmentCode?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string | null;
  type?: IssueType;
  priority?: IssuePriority;
  assigneeId?: string | null;
  verifierId?: string | null;
  moduleCode?: string | null;
  versionCode?: string | null;
  environmentCode?: string | null;
}

export interface AssignIssueInput {
  assigneeId: string;
}

export interface ResolveIssueInput {
  resolutionSummary?: string;
}

export interface ReopenIssueInput {
  remark?: string;
}

export interface CloseIssueInput {
  reason?: string;
  remark?: string;
}

export interface ListIssuesQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  projectId?: string;
  status?: IssueStatus;
  type?: IssueType;
  priority?: IssuePriority;
  assigneeId?: string;
  verifierId?: string;
}

export type IssueListResult = PageResult<IssueEntity>;
