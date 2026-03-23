import type { RequestContext } from "../../shared/context/request-context";
import type { AnnouncementQueryContract } from "../announcement/announcement.contract";
import type { IssueQueryContract } from "../issue/issue.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { RdQueryContract } from "../rd/rd.contract";
import type { DashboardQueryContract } from "./dashboard.contract";
import type { DashboardHomeData } from "./dashboard.types";

export class DashboardService implements DashboardQueryContract {
  constructor(
    private readonly projectAccess: ProjectAccessContract,
    private readonly announcementQuery: AnnouncementQueryContract,
    private readonly issueQuery: IssueQueryContract,
    private readonly rdQuery: RdQueryContract
  ) {}

  async getHomeData(ctx: RequestContext): Promise<DashboardHomeData> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    const effectiveProjectIds = ctx.roles.includes("admin") ? [] : projectIds;
    const userId = ctx.userId ?? null;

    const announcements = await this.announcementQuery.listRecentForDashboard(effectiveProjectIds, 6, ctx);
    if (!userId) {
      return {
        stats: {
          assignedIssues: 0,
          verifyingIssues: 0,
          assignedRdItems: 0,
          reviewingRdItems: 0
        },
        todos: [],
        activities: [],
        announcements: announcements.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          projectId: item.projectId,
          publishAt: item.publishAt,
          pinned: item.pinned
        }))
      };
    }

    const [
      assignedIssues,
      verifyingIssues,
      assignedRdItems,
      reviewingRdItems,
      issueTodos,
      rdTodos,
      issueActivities,
      rdActivities
    ] = await Promise.all([
      this.issueQuery.countAssignedForDashboard(effectiveProjectIds, userId, ctx),
      this.issueQuery.countVerifyingForDashboard(effectiveProjectIds, userId, ctx),
      this.rdQuery.countAssignedForDashboard(effectiveProjectIds, userId, ctx),
      this.rdQuery.countReviewingForDashboard(effectiveProjectIds, userId, ctx),
      this.issueQuery.listTodosForDashboard(effectiveProjectIds, userId, 10, ctx),
      this.rdQuery.listTodosForDashboard(effectiveProjectIds, userId, 10, ctx),
      this.issueQuery.listActivitiesForDashboard(effectiveProjectIds, userId, 6, ctx),
      this.rdQuery.listActivitiesForDashboard(effectiveProjectIds, userId, 6, ctx)
    ]);

    return {
      stats: {
        assignedIssues,
        verifyingIssues,
        assignedRdItems,
        reviewingRdItems
      },
      todos: [...issueTodos, ...rdTodos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10),
      activities: [...issueActivities, ...rdActivities]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
      announcements: announcements.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        projectId: item.projectId,
        publishAt: item.publishAt,
        pinned: item.pinned
      }))
    };
  }
}
