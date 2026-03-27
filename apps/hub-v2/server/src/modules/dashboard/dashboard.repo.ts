import type Database from "better-sqlite3";
import type {
  DashboardAnnouncementSummary,
  DashboardStats,
  DashboardTodoItem
} from "./dashboard.types";

type DashboardAnnouncementRow = {
  id: string;
  title: string;
  summary: string | null;
  project_id: string | null;
  publish_at: string | null;
  pinned: number;
};

export class DashboardRepo {
  constructor(private readonly db: Database.Database) {}

  getStats(projectIds: string[], userId: string | null): DashboardStats {
    if (!userId) {
      return {
        assignedIssues: 0,
        verifyingIssues: 0,
        assignedRdItems: 0,
        inProgressRdItems: 0,
        myProjects: 0
      };
    }

    const scope = this.createProjectScope(projectIds);
    const assignedIssues = this.count(
      `
        SELECT COUNT(*) as total
        FROM issues
        WHERE assignee_id = ?
          AND status IN ('open', 'in_progress', 'reopened')
          ${scope.clause}
      `,
      [userId, ...scope.params]
    );
    const verifyingIssues = this.count(
      `
        SELECT COUNT(*) as total
        FROM issues
        WHERE verifier_id = ?
          AND status = 'resolved'
          ${scope.clause}
      `,
      [userId, ...scope.params]
    );
    const assignedRdItems = this.count(
      `
        SELECT COUNT(*) as total
        FROM rd_items
        WHERE assignee_id = ?
          AND status IN ('todo', 'doing', 'blocked')
          ${scope.clause}
      `,
      [userId, ...scope.params]
    );
    const inProgressRdItems = this.count(
      `
        SELECT COUNT(*) as total
        FROM rd_items
        WHERE assignee_id = ?
          AND status = 'doing'
          ${scope.clause}
      `,
      [userId, ...scope.params]
    );

    return {
      assignedIssues,
      verifyingIssues,
      assignedRdItems,
      inProgressRdItems,
      myProjects: projectIds.length
    };
  }

  listTodos(projectIds: string[], userId: string | null, limit = 10): DashboardTodoItem[] {
    if (!userId) {
      return [];
    }

    const scope = this.createProjectScope(projectIds);
    const issuesAssigned = this.db
      .prepare(
        `
          SELECT id, issue_no as code, title, status, updated_at, project_id
          FROM issues
          WHERE assignee_id = ?
            AND status IN ('open', 'in_progress', 'reopened')
            ${scope.clause}
          ORDER BY updated_at DESC
          LIMIT ?
        `
      )
      .all(userId, ...scope.params, limit) as Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      updated_at: string;
      project_id: string;
    }>;

    const issuesVerify = this.db
      .prepare(
        `
          SELECT id, issue_no as code, title, status, updated_at, project_id
          FROM issues
          WHERE verifier_id = ?
            AND status = 'resolved'
            ${scope.clause}
          ORDER BY updated_at DESC
          LIMIT ?
        `
      )
      .all(userId, ...scope.params, limit) as Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      updated_at: string;
      project_id: string;
    }>;

    const rdAssigned = this.db
      .prepare(
        `
          SELECT id, rd_no as code, title, status, updated_at, project_id
          FROM rd_items
          WHERE assignee_id = ?
            AND status IN ('todo', 'doing', 'blocked')
            ${scope.clause}
          ORDER BY updated_at DESC
          LIMIT ?
        `
      )
      .all(userId, ...scope.params, limit) as Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      updated_at: string;
      project_id: string;
    }>;

    return [
      ...issuesAssigned.map((row) => this.mapTodo("issue_assigned", row)),
      ...issuesVerify.map((row) => this.mapTodo("issue_verify", row)),
      ...rdAssigned.map((row) => this.mapTodo("rd_assigned", row))
    ]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  listRecentAnnouncements(projectIds: string[], limit = 6): DashboardAnnouncementSummary[] {
    const scope = this.createAnnouncementScope(projectIds);
    const rows = this.db
      .prepare(
        `
          SELECT id, title, summary, project_id, publish_at, pinned
          FROM announcements
          WHERE status = 'published'
            ${scope.clause}
          ORDER BY pinned DESC, publish_at DESC, updated_at DESC
          LIMIT ?
        `
      )
      .all(...scope.params, limit) as DashboardAnnouncementRow[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      projectId: row.project_id,
      publishAt: row.publish_at,
      pinned: row.pinned === 1
    }));
  }

  private count(sql: string, params: unknown[]): number {
    const row = this.db.prepare(sql).get(...params) as { total: number };
    return row.total;
  }

  private createProjectScope(projectIds: string[]) {
    if (projectIds.length === 0) {
      return { clause: "", params: [] as string[] };
    }
    return {
      clause: `AND project_id IN (${projectIds.map(() => "?").join(", ")})`,
      params: projectIds
    };
  }

  private createAnnouncementScope(projectIds: string[]) {
    if (projectIds.length === 0) {
      return {
        clause: "AND (scope = 'global' OR project_id IS NULL)",
        params: [] as string[]
      };
    }
    return {
      clause: `AND (scope = 'global' OR project_id IN (${projectIds.map(() => "?").join(", ")}))`,
      params: projectIds
    };
  }

  private mapTodo(
    kind: DashboardTodoItem["kind"],
    row: { id: string; code: string; title: string; status: string; updated_at: string; project_id: string }
  ): DashboardTodoItem {
    return {
      kind,
      entityId: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
      projectId: row.project_id
    };
  }
}
