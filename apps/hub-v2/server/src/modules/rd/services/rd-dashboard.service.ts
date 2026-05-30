import type { RequestContext } from "../../../shared/context/request-context";
import type { RdDashboardActivity, RdDashboardTodo } from "../rd.types";
import type { RdServiceContext } from "./rd-service-context";

export class RdDashboardService {
  constructor(private readonly context: RdServiceContext) {}

  async countAssignedForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.context.repo.countAssignedForDashboard(projectIds, userId);
  }

  async countInProgressForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.context.repo.countInProgressForDashboard(projectIds, userId);
  }

  async countReviewingForDashboard(projectIds: string[], userId: string, _ctx: RequestContext): Promise<number> {
    return this.context.repo.countReviewingForDashboard(projectIds, userId);
  }

  async listTodosForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    _ctx: RequestContext
  ): Promise<RdDashboardTodo[]> {
    return this.context.repo.listTodosForDashboard(projectIds, userId, limit);
  }

  async listActivitiesForDashboard(
    projectIds: string[],
    userId: string,
    limit: number,
    _ctx: RequestContext
  ): Promise<RdDashboardActivity[]> {
    return this.context.repo.listActivitiesForDashboard(projectIds, userId, limit);
  }
}
