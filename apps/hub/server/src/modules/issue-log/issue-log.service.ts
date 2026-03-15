import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type { IssueStatus, IssueActionType } from "../issue/issue.types";
import { IssueLogRepo } from "./issue-log.repo";
import type { IssueActionLogEntity } from "./issue-log.types";

export class IssueLogService {
  constructor(private readonly repo: IssueLogRepo) {}

  record(input: {
    issueId: string;
    actionType: IssueActionType;
    fromStatus?: IssueStatus | null;
    toStatus?: IssueStatus | null;
    operatorId?: string | null;
    operatorName?: string | null;
    summary?: string | null;
  }): void {
    this.repo.create({
      id: genId("ial"),
      issueId: input.issueId,
      actionType: input.actionType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      operatorId: input.operatorId ?? null,
      operatorName: input.operatorName ?? null,
      summary: input.summary ?? null,
      createdAt: nowIso()
    });
  }

  list(issueId: string): IssueActionLogEntity[] {
    return this.repo.listByIssueId(issueId);
  }
}
