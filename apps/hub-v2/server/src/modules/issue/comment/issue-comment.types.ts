export interface IssueCommentEntity {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentionsJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueCommentInput {
  content: string;
  mentions?: string[];
}
