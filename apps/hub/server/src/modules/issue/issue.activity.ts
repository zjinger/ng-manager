import type { IssueActionType, IssueStatus } from "./issue.types";

export class IssueActivityService {
  record(_input: {
    issueId: string;
    actionType: IssueActionType;
    fromStatus?: IssueStatus | null;
    toStatus?: IssueStatus | null;
    operatorId?: string | null;
    operatorName?: string | null;
    summary?: string | null;
  }): void {
    // legacy adapter kept for compile compatibility
  }
}
