import type { AiIssueRecommendInput, AiIssueRecommendResult, ProjectModule } from "./ai.types";
import type { HistoricalIssue, HistoricalAssignee } from "./ai.types";
import type { SqlGenerationResult } from "./ai-report-sql.service";
import type { RequestContext } from "../../shared/context/request-context";

export interface AiIssueContract {
  recommend(
    input: AiIssueRecommendInput,
    historicalIssues: HistoricalIssue[],
    projectModules: ProjectModule[]
  ): Promise<AiIssueRecommendResult>;

  recommendAssignee(
    input: {
      title: string;
      description?: string | null;
      type: string;
      moduleCode?: string | null;
      projectId: string;
    },
    historicalAssignees: HistoricalAssignee[]
  ): Promise<{
    assigneeId: string | null;
    assigneeName: string | null;
    confidence: number;
    reason: string;
  }>;
}

export interface AiReportSqlContract {
  generateSql(query: string, ctx: RequestContext): Promise<SqlGenerationResult>;
  prepareSqlForExecution(rawSql: string, ctx: RequestContext): Promise<{ sql: string; params: string[] }>;
}

export interface AiReportRenderContract {
  executeAndRender(sql: string, params: string[]): {
    type: "stat_card" | "trend_chart" | "distribution_chart" | "leaderboard" | "table" | "empty";
    title: string;
    description?: string;
    value?: number | string;
    chart?: unknown;
    columns?: { key: string; label: string }[];
    rows?: Record<string, unknown>[];
    items?: { rank: number; label: string; value: number; percent?: number }[];
  };
}
