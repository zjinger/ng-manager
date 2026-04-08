export type IssueBranchStatus = "todo" | "in_progress" | "done";

export interface IssueBranchEntity {
  id: string;
  issueId: string;
  ownerUserId: string;
  ownerUserName: string;
  title: string;
  status: IssueBranchStatus;
  summary: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueBranchInput {
  ownerUserId: string;
  title: string;
}

export interface StartOwnIssueBranchInput {
  title: string;
}

export interface CompleteIssueBranchInput {
  summary?: string;
}
