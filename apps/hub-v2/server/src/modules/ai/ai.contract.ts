import type { AiIssueRecommendInput, AiIssueRecommendResult } from "./ai.types";
import type { HistoricalIssue, HistoricalAssignee } from "./ai.types";
import type { SqlGenerationResult } from "./ai-report-sql.service";
import type { RequestContext } from "../../shared/context/request-context";

export interface AiIssueContract {
  recommend(
    input: AiIssueRecommendInput,
    historicalIssues: HistoricalIssue[]
  ): Promise<AiIssueRecommendResult>;

  recommendAssignee(
    input: {
      title: string;
      description?: string | null;
      type: string;
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
}

export interface AiReportRenderContract {
  executeAndRender(sql: string, params: string[]): Promise<{
    type: "stat_card" | "trend_chart" | "distribution_chart" | "leaderboard" | "table" | "empty";
    title: string;
    description?: string;
    value?: number | string;
    chart?: unknown;
    columns?: { key: string; label: string }[];
    rows?: Record<string, unknown>[];
    items?: { rank: number; label: string; value: number; percent?: number }[];
  }>;
}