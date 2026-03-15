export interface IssueParticipantEntity {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface AddIssueParticipantInput {
  projectId: string;
  issueId: string;
  userId: string;
  operatorId?: string | null;
  operatorName?: string | null;
}

export interface RemoveIssueParticipantInput {
  projectId: string;
  issueId: string;
  userId: string;
  operatorId?: string | null;
  operatorName?: string | null;
}
