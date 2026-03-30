import type { RequestContext } from "../../shared/context/request-context";
import type { AnnouncementQueryContract } from "../announcement/announcement.contract";
import type { ContentLogQueryContract } from "../content-log/content-log.contract";
import type { DocumentQueryContract } from "../document/document.contract";
import type { IssueQueryContract } from "../issue/issue.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { RdQueryContract } from "../rd/rd.contract";
import type { DashboardQueryContract } from "./dashboard.contract";
import type { DashboardHomeData } from "./dashboard.types";

export class DashboardService implements DashboardQueryContract {
  constructor(
    private readonly projectAccess: ProjectAccessContract,
    private readonly announcementQuery: AnnouncementQueryContract,
    private readonly documentQuery: DocumentQueryContract,
    private readonly contentLogQuery: ContentLogQueryContract,
    private readonly issueQuery: IssueQueryContract,
    private readonly rdQuery: RdQueryContract
  ) {}

  async getHomeData(ctx: RequestContext): Promise<DashboardHomeData> {
    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    const effectiveProjectIds = ctx.roles.includes("admin") ? [] : projectIds;
    const userId = ctx.userId ?? null;

    const [announcements, documents, contentActivities] = await Promise.all([
      this.announcementQuery.listRecentForDashboard(effectiveProjectIds, 6, ctx),
      this.documentQuery.listRecentPublishedForNotifications(effectiveProjectIds, 6, ctx),
      this.contentLogQuery.listRecent(effectiveProjectIds, 12)
    ]);
    if (!userId) {
      return {
        stats: {
          assignedIssues: 0,
          verifyingIssues: 0,
          assignedRdItems: 0,
          inProgressRdItems: 0,
          myProjects: 0
        },
        todos: [],
        activities: contentActivities
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 8)
          .map((item) => ({
            kind: "content_activity" as const,
            entityId: item.contentId,
            code: this.contentCode(item.contentType),
            title: item.title,
            action: `${item.contentType}.${item.actionType}`,
            summary: item.summary,
            createdAt: item.createdAt,
            projectId: item.projectId ?? ""
          })),
        announcements: announcements.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          projectId: item.projectId,
          publishAt: item.publishAt,
          pinned: item.pinned
        })),
        documents: documents.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          projectId: item.projectId,
          publishAt: item.publishAt,
          category: item.category,
          version: item.version,
          slug: item.slug
        }))
      };
    }

    const [
      assignedIssues,
      verifyingIssues,
      assignedRdItems,
      inProgressRdItems,
      issueTodos,
      rdTodos,
      issueActivities,
      rdActivities,
      contentActivitiesForUser
    ] = await Promise.all([
      this.issueQuery.countAssignedForDashboard(effectiveProjectIds, userId, ctx),
      this.issueQuery.countVerifyingForDashboard(effectiveProjectIds, userId, ctx),
      this.rdQuery.countAssignedForDashboard(effectiveProjectIds, userId, ctx),
      this.rdQuery.countInProgressForDashboard(effectiveProjectIds, userId, ctx),
      this.issueQuery.listTodosForDashboard(effectiveProjectIds, userId, 10, ctx),
      this.rdQuery.listTodosForDashboard(effectiveProjectIds, userId, 10, ctx),
      this.issueQuery.listActivitiesForDashboard(effectiveProjectIds, userId, 6, ctx),
      this.rdQuery.listActivitiesForDashboard(effectiveProjectIds, userId, 6, ctx),
      this.contentLogQuery.listRecent(effectiveProjectIds, 8)
    ]);

    return {
      stats: {
        assignedIssues,
        verifyingIssues,
        assignedRdItems,
        inProgressRdItems,
        myProjects: projectIds.length
      },
      todos: [...issueTodos, ...rdTodos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10),
      activities: [
        ...issueActivities,
        ...rdActivities,
        ...contentActivitiesForUser.map((item) => ({
          kind: "content_activity" as const,
          entityId: item.contentId,
          code: this.contentCode(item.contentType),
          title: item.title,
          action: `${item.contentType}.${item.actionType}`,
          summary: item.summary,
          createdAt: item.createdAt,
          projectId: item.projectId ?? ""
        }))
      ]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
      announcements: announcements.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        projectId: item.projectId,
        publishAt: item.publishAt,
        pinned: item.pinned
      })),
      documents: documents.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        projectId: item.projectId,
        publishAt: item.publishAt,
        category: item.category,
        version: item.version,
        slug: item.slug
      }))
    };
  }

  private contentCode(type: string): string {
    if (type === "announcement") return "ANN";
    if (type === "document") return "DOC";
    if (type === "release") return "REL";
    return "CNT";
  }
}
