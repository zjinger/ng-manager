import type { RequestContext } from "../../shared/context/request-context";
import type {
  AssignIssueInput,
  CloseIssueInput,
  CreateIssueInput,
  IssueEntity,
  IssueDashboardTodo,
  IssueListResult,
  IssueLogEntity,
  ListIssuesQuery,
  ReopenIssueInput,
  ResolveIssueInput,
  UpdateIssueInput
} from "./issue.types";

export interface IssueCommandContract {
  create(input: CreateIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  update(id: string, input: UpdateIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  assign(id: string, input: AssignIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  start(id: string, ctx: RequestContext): Promise<IssueEntity>;
  resolve(id: string, input: ResolveIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  verify(id: string, ctx: RequestContext): Promise<IssueEntity>;
  reopen(id: string, input: ReopenIssueInput, ctx: RequestContext): Promise<IssueEntity>;
  close(id: string, input: CloseIssueInput, ctx: RequestContext): Promise<IssueEntity>;
}

export interface IssueQueryContract {
  list(query: ListIssuesQuery, ctx: RequestContext): Promise<IssueListResult>;
  getById(id: string, ctx: RequestContext): Promise<IssueEntity>;
  listLogs(id: string, ctx: RequestContext): Promise<IssueLogEntity[]>;
  countAssignedForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number>;
  countVerifyingForDashboard(projectIds: string[], userId: string, ctx: RequestContext): Promise<number>;
  listTodosForDashboard(projectIds: string[], userId: string, limit: number, ctx: RequestContext): Promise<IssueDashboardTodo[]>;
}
