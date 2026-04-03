import type Database from "better-sqlite3";
import type { HistoricalIssue, HistoricalAssignee, ProjectModule } from "./ai.types";

/**
 * AI 模块数据访问层
 * 
 * 注意：AI 模块本身不直接管理业务实体，
 * 而是通过其他模块的 Repo 获取数据。
 * 此 Repo 主要用于：
 * 1. AI 查询历史记录
 * 2. 用户反馈记录
 * 3. 缓存相关的持久化（可选）
 */

export interface AiQueryLogEntity {
  id: string;
  userId: string;
  queryType: "issue_recommend" | "assignee_recommend" | "report_sql";
  input: string;
  output: string;
  confidence: number;
  wasAccepted: boolean | null;
  createdAt: string;
}

export class AiRepo {
  constructor(private readonly db: Database.Database) {}

  /**
   * 记录 AI 查询日志（用于后续优化模型）
   */
  createQueryLog(log: AiQueryLogEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO ai_query_logs (
            id, user_id, query_type, input, output, confidence, was_accepted, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        log.id,
        log.userId,
        log.queryType,
        log.input,
        log.output,
        log.confidence,
        log.wasAccepted,
        log.createdAt
      );
  }

  /**
   * 获取项目历史 Issue（用于 AI 推荐上下文）
   */
  listHistoricalIssues(projectId: string, limit: number): HistoricalIssue[] {
    const rows = this.db
      .prepare(
        `
          SELECT title, type, priority, module_code as moduleCode
          FROM issues
          WHERE project_id = ?
            AND status IN ('closed', 'resolved', 'verified')
          ORDER BY updated_at DESC
          LIMIT ?
        `
      )
      .all(projectId, limit) as HistoricalIssue[];

    return rows;
  }

  /**
   * 获取项目历史指派记录（用于 AI 指派推荐）
   */
  listHistoricalAssignees(projectId: string, limit: number): HistoricalAssignee[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            assignee_id as userId,
            assignee_name as userName,
            type,
            COUNT(*) as count
          FROM issues
          WHERE project_id = ?
            AND assignee_id IS NOT NULL
            AND status IN ('closed', 'resolved', 'verified')
          GROUP BY assignee_id, type
          ORDER BY count DESC
          LIMIT ?
        `
      )
      .all(projectId, limit) as HistoricalAssignee[];

    return rows;
  }

  /**
   * 获取项目可用模块（用于 AI 模块推荐）
   */
  listProjectModules(projectId: string): ProjectModule[] {
    const rows = this.db
      .prepare(
        `
          SELECT code, name
          FROM project_modules
          WHERE project_id = ?
            AND enabled = 1
          ORDER BY sort ASC
        `
      )
      .all(projectId) as Array<{ code: string | null; name: string }>;

    return rows.map((row) => ({
      code: row.code?.trim() || row.name,
      name: row.name
    }));
  }

  /**
   * 获取用户最近的 AI 查询记录
   */
  listRecentQueriesByUser(userId: string, limit: number = 10): AiQueryLogEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM ai_query_logs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `
      )
      .all(userId, limit) as AiQueryLogEntity[];

    return rows;
  }
}
