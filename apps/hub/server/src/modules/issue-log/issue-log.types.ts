import type { IssueActionType, IssueStatus } from "../issue/issue.types";

export interface IssueActionLogEntity {
  id: string;
  issueId: string;
  actionType: IssueActionType;
  fromStatus?: IssueStatus | null;
  toStatus?: IssueStatus | null;
  operatorId?: string | null;
  operatorName?: string | null;
  summary?: string | null;
  createdAt: string;
}

export interface CreateIssueActionLogInput {
  id: string;
  issueId: string;
  actionType: IssueActionType;
  fromStatus?: IssueStatus | null;
  toStatus?: IssueStatus | null;
  operatorId?: string | null;
  operatorName?: string | null;
  summary?: string | null;
  createdAt: string;
}
