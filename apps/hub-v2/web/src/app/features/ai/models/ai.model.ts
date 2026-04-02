import type { IssuePriority, IssueType } from '../../issues/models/issue.model';

export interface AiIssueRecommendResult {
  type: IssueType | null;
  priority: IssuePriority | null;
  confidence: number;
  reason: string;
}

export interface AiAssigneeRecommendResult {
  assigneeId: string | null;
  assigneeName: string | null;
  confidence: number;
  reason: string;
}
