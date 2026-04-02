import type { IssueType, IssuePriority } from "../issue/issue.types";

export interface AiIssueRecommendInput {
  title: string;
  description?: string | null;
  projectId: string;
}

export interface AiIssueRecommendResult {
  type: IssueType | null;
  priority: IssuePriority | null;
  confidence: number;
  reason: string;
}

export interface AiAssigneeRecommendInput {
  title: string;
  description?: string | null;
  type: IssueType;
  projectId: string;
}

export interface AiAssigneeRecommendResult {
  assigneeId: string | null;
  assigneeName: string | null;
  confidence: number;
  reason: string;
}

export interface HistoricalIssue {
  title: string;
  type: IssueType;
  priority: IssuePriority;
}

export interface HistoricalAssignee {
  userId: string;
  userName: string;
  type: IssueType;
  count: number;
}
