export interface IssueCommentMentionEntity {
  userId: string;
  displayName: string;
}

export interface IssueCommentEntity {
  id: string;
  issueId: string;
  authorId?: string | null;
  authorName?: string | null;
  content: string;
  mentions: IssueCommentMentionEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueCommentInput {
  projectId: string;
  issueId: string;
  content: string;
  mentions?: IssueCommentMentionEntity[];
  operatorId?: string | null;
  operatorName?: string | null;
}
