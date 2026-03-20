export interface IssueParticipantEntity {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface AddIssueParticipantInput {
  userId: string;
}
