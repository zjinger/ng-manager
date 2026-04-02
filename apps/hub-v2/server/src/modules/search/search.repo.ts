import type Database from "better-sqlite3";
import type { SearchEntityType } from "./search.types";

type SearchRepoInput = {
  matchExpression: string;
  projectIds: string[];
  includeGlobalProjectNull: boolean;
  globalProjectNullPublishedOnly: boolean;
  types?: SearchEntityType[];
  limit: number;
};

export type SearchRepoResult = {
  items: SearchRepoItem[];
  total: number;
};

type SearchRow = {
  entity_type: SearchEntityType;
  entity_id: string;
  project_id: string | null;
  title: string;
  snippet: string | null;
  updated_at: string;
  score: number;
};

export type SearchRepoItem = {
  entityType: SearchEntityType;
  entityId: string;
  projectId: string | null;
  title: string;
  snippet: string;
  updatedAt: string;
  score: number;
};

export class SearchRepo {
  private static readonly TITLE_WEIGHT = 6.0;
  private static readonly BODY_WEIGHT = 1.0;

  constructor(private readonly db: Database.Database) {}

  search(input: SearchRepoInput): SearchRepoResult {
    if (!input.matchExpression.trim()) {
      return { items: [], total: 0 };
    }

    if (input.projectIds.length === 0 && !input.includeGlobalProjectNull) {
      return { items: [], total: 0 };
    }

    const { conditions, params } = this.buildWhere(input);

    const whereSql = conditions.join(" AND ");
    const countSql = `SELECT COUNT(1) AS total FROM global_search_fts WHERE ${whereSql}`;
    const totalRow = this.db.prepare(countSql).get(...params) as { total: number } | undefined;
    const total = totalRow?.total ?? 0;
    if (total <= 0) {
      return { items: [], total: 0 };
    }

    const sql = `
      SELECT
        entity_type,
        entity_id,
        project_id,
        title,
        COALESCE(NULLIF(snippet(global_search_fts, 5, '', '', ' ... ', 14), ''), title) AS snippet,
        updated_at,
        bm25(global_search_fts, ${SearchRepo.TITLE_WEIGHT}, ${SearchRepo.BODY_WEIGHT}) AS score
      FROM global_search_fts
      WHERE ${whereSql}
      ORDER BY score ASC, updated_at DESC
      LIMIT ?
    `;

    params.push(input.limit);
    const rows = this.db.prepare(sql).all(...params) as SearchRow[];

    return {
      items: rows.map((row) => ({
        entityType: row.entity_type,
        entityId: row.entity_id,
        projectId: row.project_id,
        title: row.title,
        snippet: row.snippet ?? row.title,
        updatedAt: row.updated_at,
        score: Number(row.score) || 0
      })),
      total
    };
  }

  private buildWhere(input: SearchRepoInput): { conditions: string[]; params: unknown[] } {
    const conditions: string[] = ["global_search_fts MATCH ?"];
    const params: unknown[] = [input.matchExpression];

    if (input.projectIds.length > 0 && input.includeGlobalProjectNull) {
      if (input.globalProjectNullPublishedOnly) {
        conditions.push(
          `(project_id IN (${input.projectIds.map(() => "?").join(",")}) OR ${this.buildGlobalPublishedNullFilter()})`
        );
      } else {
        conditions.push(`(project_id IN (${input.projectIds.map(() => "?").join(",")}) OR project_id IS NULL)`);
      }
      params.push(...input.projectIds);
    } else if (input.projectIds.length > 0) {
      conditions.push(`project_id IN (${input.projectIds.map(() => "?").join(",")})`);
      params.push(...input.projectIds);
    } else if (input.includeGlobalProjectNull) {
      conditions.push(
        input.globalProjectNullPublishedOnly
          ? this.buildGlobalPublishedNullFilter()
          : "project_id IS NULL"
      );
    }

    if (input.types && input.types.length > 0) {
      conditions.push(`entity_type IN (${input.types.map(() => "?").join(",")})`);
      params.push(...input.types);
    }

    return { conditions, params };
  }

  private buildGlobalPublishedNullFilter(): string {
    return `(
      project_id IS NULL
      AND entity_type IN ('document', 'release')
      AND status = 'published'
    )`;
  }
}
