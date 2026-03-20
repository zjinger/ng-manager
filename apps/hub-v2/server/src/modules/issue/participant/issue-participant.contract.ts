import type { RequestContext } from "../../../shared/context/request-context";
import type { AddIssueParticipantInput, IssueParticipantEntity } from "./issue-participant.types";

export interface IssueParticipantCommandContract {
  add(issueId: string, input: AddIssueParticipantInput, ctx: RequestContext): Promise<IssueParticipantEntity>;
  remove(issueId: string, participantId: string, ctx: RequestContext): Promise<{ ok: true }>;
}

export interface IssueParticipantQueryContract {
  list(issueId: string, ctx: RequestContext): Promise<IssueParticipantEntity[]>;
}
