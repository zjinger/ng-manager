import type Database from "better-sqlite3";
import type {
  DashboardBoardData,
  DashboardBoardDistribution,
  DashboardBoardMetric,
  DashboardBoardOverview,
  DashboardBoardRange,
  DashboardBoardTrend
} from "./dashboard.types";

type DashboardScope = {
  includeAll: boolean;
  projectIds: string[];
  projectKey: string | null;
};

type DateCountRow = {
  day: string;
  total: number;
};

type BucketRow = {
  key: string;
  total: number;
};

type StageBucketRow = {
  key: string | null;
  label: string | null;
  total: number;
};

const ISSUE_PRIORITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "紧急"
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  in_progress: "处理中",
  resolved: "待验证",
  verified: "已验证",
  closed: "已关闭",
  reopened: "重新打开"
};

const RD_STATUS_LABELS: Record<string, string> = {
  todo: "待开始",
  doing: "进行中",
  blocked: "阻塞中",
  done: "已完成",
  accepted: "已验收",
  closed: "已关闭"
};

export class DashboardRepo {
  constructor(private readonly db: Database.Database) {}

  getBoardData(range: DashboardBoardRange, scope: DashboardScope): DashboardBoardData {
    return {
      range,
      projectId: scope.projectIds.length === 1 ? scope.projectIds[0] : null,
      overview: this.getBoardOverview(scope),
      trend: this.getBoardTrend(range, scope),
      distribution: this.getBoardDistribution(scope)
    };
  }

  private getBoardOverview(scope: DashboardScope): DashboardBoardOverview {
    const issueScope = this.createProjectScopeClause("issues.project_id", scope);
    const rdScope = this.createProjectScopeClause("rd_items.project_id", scope);
    const releaseScope = this.createNullableProjectScopeClause("releases.project_id", scope);
    const feedbackScope = this.createFeedbackScopeClause(scope);

    const openIssues = this.count(
      `
        SELECT COUNT(*) as total
        FROM issues
        WHERE status IN ('open', 'in_progress', 'resolved', 'reopened')
          ${issueScope.clause}
      `,
      issueScope.params
    );
    const pendingVerifyIssues = this.count(
      `
        SELECT COUNT(*) as total
        FROM issues
        WHERE status = 'resolved'
          ${issueScope.clause}
      `,
      issueScope.params
    );
    const inProgressRdItems = this.count(
      `
        SELECT COUNT(*) as total
        FROM rd_items
        WHERE status IN ('doing', 'blocked')
          ${rdScope.clause}
      `,
      rdScope.params
    );
    const recentReleaseCount = this.count(
      `
        SELECT COUNT(*) as total
        FROM releases
        WHERE status = 'published'
          AND DATE(COALESCE(published_at, updated_at)) >= DATE('now', '-6 day')
          ${releaseScope.clause}
      `,
      releaseScope.params
    );
    const unprocessedFeedbackCount = this.count(
      `
        SELECT COUNT(*) as total
        FROM feedbacks
        ${feedbackScope.joinClause}
        WHERE status IN ('open', 'processing')
          ${feedbackScope.whereClause}
      `,
      feedbackScope.params
    );

    return {
      openIssues,
      pendingVerifyIssues,
      inProgressRdItems,
      recentReleaseCount,
      unprocessedFeedbackCount
    };
  }

  private getBoardTrend(range: DashboardBoardRange, scope: DashboardScope): DashboardBoardTrend {
    const days = range === "30d" ? 30 : 7;
    const labels = this.createDateLabels(days);

    const issueScope = this.createProjectScopeClause("issues.project_id", scope);
    const rdScope = this.createProjectScopeClause("rd_items.project_id", scope);

    const issueCreatedRows = this.db
      .prepare(
        `
          SELECT SUBSTR(created_at, 1, 10) as day, COUNT(*) as total
          FROM issues
          WHERE DATE(created_at) >= DATE('now', ?)
            ${issueScope.clause}
          GROUP BY SUBSTR(created_at, 1, 10)
        `
      )
      .all(`-${days - 1} day`, ...issueScope.params) as DateCountRow[];

    const issueClosedRows = this.db
      .prepare(
        `
          SELECT SUBSTR(closed_at, 1, 10) as day, COUNT(*) as total
          FROM issues
          WHERE closed_at IS NOT NULL
            AND DATE(closed_at) >= DATE('now', ?)
            ${issueScope.clause}
          GROUP BY SUBSTR(closed_at, 1, 10)
        `
      )
      .all(`-${days - 1} day`, ...issueScope.params) as DateCountRow[];

    const rdCompletedRows = this.db
      .prepare(
        `
          SELECT SUBSTR(COALESCE(actual_end_at, updated_at), 1, 10) as day, COUNT(*) as total
          FROM rd_items
          WHERE status IN ('done', 'closed')
            AND DATE(COALESCE(actual_end_at, updated_at)) >= DATE('now', ?)
            ${rdScope.clause}
          GROUP BY SUBSTR(COALESCE(actual_end_at, updated_at), 1, 10)
        `
      )
      .all(`-${days - 1} day`, ...rdScope.params) as DateCountRow[];

    return {
      labels,
      issueCreated: this.alignSeries(labels, issueCreatedRows),
      issueClosed: this.alignSeries(labels, issueClosedRows),
      rdCompleted: this.alignSeries(labels, rdCompletedRows)
    };
  }

  private getBoardDistribution(scope: DashboardScope): DashboardBoardDistribution {
    const issueScope = this.createProjectScopeClause("issues.project_id", scope);
    const rdScope = this.createProjectScopeClause("rd_items.project_id", scope);

    const issuePriorityRows = this.db
      .prepare(
        `
          SELECT priority as key, COUNT(*) as total
          FROM issues
          WHERE 1=1
            ${issueScope.clause}
          GROUP BY priority
        `
      )
      .all(...issueScope.params) as BucketRow[];

    const issueStatusRows = this.db
      .prepare(
        `
          SELECT status as key, COUNT(*) as total
          FROM issues
          WHERE 1=1
            ${issueScope.clause}
          GROUP BY status
        `
      )
      .all(...issueScope.params) as BucketRow[];

    const rdStatusRows = this.db
      .prepare(
        `
          SELECT status as key, COUNT(*) as total
          FROM rd_items
          WHERE 1=1
            ${rdScope.clause}
          GROUP BY status
        `
      )
      .all(...rdScope.params) as BucketRow[];

    const rdStageRows = this.db
      .prepare(
        `
          SELECT COALESCE(rd_items.stage_id, '__none__') as key, COALESCE(rd_stages.name, '未分阶段') as label, COUNT(*) as total
          FROM rd_items
          LEFT JOIN rd_stages ON rd_stages.id = rd_items.stage_id
          WHERE 1=1
            ${rdScope.clause}
          GROUP BY COALESCE(rd_items.stage_id, '__none__'), COALESCE(rd_stages.name, '未分阶段')
        `
      )
      .all(...rdScope.params) as StageBucketRow[];

    return {
      issueByPriority: this.toMetrics(issuePriorityRows, ISSUE_PRIORITY_LABELS),
      issueByStatus: this.toMetrics(issueStatusRows, ISSUE_STATUS_LABELS),
      rdByStatus: this.toMetrics(rdStatusRows, RD_STATUS_LABELS),
      rdByStage: rdStageRows
        .map((row) => ({
          key: row.key || "__none__",
          label: row.label || "未分阶段",
          value: row.total
        }))
        .sort((a, b) => b.value - a.value)
    };
  }

  private alignSeries(labels: string[], rows: DateCountRow[]): number[] {
    const map = new Map(rows.map((item) => [item.day, item.total]));
    return labels.map((label) => map.get(label) ?? 0);
  }

  private createDateLabels(days: number): string[] {
    const labels: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      labels.push(date.toISOString().slice(0, 10));
    }
    return labels;
  }

  private toMetrics(rows: BucketRow[], labelMap: Record<string, string>): DashboardBoardMetric[] {
    return rows
      .map((row) => ({
        key: row.key,
        label: labelMap[row.key] ?? row.key,
        value: row.total
      }))
      .sort((a, b) => b.value - a.value);
  }

  private count(sql: string, params: unknown[]): number {
    const row = this.db.prepare(sql).get(...params) as { total: number };
    return row.total;
  }

  private createProjectScopeClause(column: string, scope: DashboardScope): { clause: string; params: string[] } {
    if (scope.includeAll) {
      return { clause: "", params: [] };
    }
    if (scope.projectIds.length === 0) {
      return { clause: "AND 1=0", params: [] };
    }
    return {
      clause: `AND ${column} IN (${scope.projectIds.map(() => "?").join(", ")})`,
      params: scope.projectIds
    };
  }

  private createNullableProjectScopeClause(column: string, scope: DashboardScope): { clause: string; params: string[] } {
    if (scope.includeAll) {
      return { clause: "", params: [] };
    }
    if (scope.projectIds.length === 0) {
      return { clause: "AND 1=0", params: [] };
    }
    return {
      clause: `AND ${column} IN (${scope.projectIds.map(() => "?").join(", ")})`,
      params: scope.projectIds
    };
  }

  private createFeedbackScopeClause(scope: DashboardScope): { joinClause: string; whereClause: string; params: string[] } {
    if (scope.includeAll) {
      return { joinClause: "", whereClause: "", params: [] };
    }
    if (scope.projectIds.length === 0) {
      return { joinClause: "", whereClause: "AND 1=0", params: [] };
    }
    if (scope.projectKey) {
      return {
        joinClause: "",
        whereClause: "AND project_key = ?",
        params: [scope.projectKey]
      };
    }
    return {
      joinClause: "LEFT JOIN projects ON projects.project_key = feedbacks.project_key",
      whereClause: `AND projects.id IN (${scope.projectIds.map(() => "?").join(", ")})`,
      params: scope.projectIds
    };
  }
}
