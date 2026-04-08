import type { RequestContext } from "../../../shared/context/request-context";
import type {
  CompleteIssueBranchInput,
  CreateIssueBranchInput,
  IssueBranchEntity,
  StartOwnIssueBranchInput
} from "./issue-branch.types";

export interface IssueBranchCommandContract {
  create(issueId: string, input: CreateIssueBranchInput, ctx: RequestContext): Promise<IssueBranchEntity>;
  start(issueId: string, branchId: string, ctx: RequestContext): Promise<IssueBranchEntity>;
  startMine(issueId: string, input: StartOwnIssueBranchInput, ctx: RequestContext): Promise<IssueBranchEntity>;
  complete(issueId: string, branchId: string, input: CompleteIssueBranchInput, ctx: RequestContext): Promise<IssueBranchEntity>;
}

export interface IssueBranchQueryContract {
  list(issueId: string, ctx: RequestContext): Promise<IssueBranchEntity[]>;
}
