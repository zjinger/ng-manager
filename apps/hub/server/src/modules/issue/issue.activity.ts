import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { IssueRepo } from "./issue.repo";
import type { IssueActionLogEntity, IssueActionType, IssueStatus } from "./issue.types";

export class IssueActivityService {
    constructor(private readonly repo: IssueRepo) { }

    record(input: {
        issueId: string;
        actionType: IssueActionType;
        fromStatus?: IssueStatus | null;
        toStatus?: IssueStatus | null;
        operatorId?: string | null;
        operatorName?: string | null;
        summary?: string | null;
        meta?: Record<string, unknown> | null;
    }): void {
        const entity: IssueActionLogEntity = {
            id: genId("ial"),
            issueId: input.issueId,
            actionType: input.actionType,
            fromStatus: input.fromStatus ?? null,
            toStatus: input.toStatus ?? null,
            operatorId: input.operatorId ?? null,
            operatorName: input.operatorName ?? null,
            summary: input.summary ?? null,
            metaJson: input.meta && Object.keys(input.meta).length > 0 ? JSON.stringify(input.meta) : null,
            createdAt: nowIso()
        };
        this.repo.createActionLog(entity);
    }
}
