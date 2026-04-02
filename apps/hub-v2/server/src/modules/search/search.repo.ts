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
  constructor(private readonly db: Database.Database) {}

  search(input: SearchRepoInput): SearchRepoItem[] {
    if (!input.matchExpression.trim()) {
      return [];
    }

    if (input.projectIds.length === 0 && !input.includeGlobalProjectNull) {
      return [];
    }

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

    const sql = `
      SELECT
        entity_type,
        entity_id,
        project_id,
        title,
        COALESCE(NULLIF(snippet(global_search_fts, 4, '', '', ' ... ', 14), ''), title) AS snippet,
        updated_at,
        bm25(global_search_fts, 6.0, 1.0) AS score
      FROM global_search_fts
      WHERE ${conditions.join(" AND ")}
      ORDER BY score ASC, updated_at DESC
      LIMIT ?
    `;

    params.push(input.limit);
    const rows = this.db.prepare(sql).all(...params) as SearchRow[];

    return rows.map((row) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      projectId: row.project_id,
      title: row.title,
      snippet: row.snippet ?? row.title,
      updatedAt: row.updated_at,
      score: Number(row.score) || 0
    }));
  }

  private buildGlobalPublishedNullFilter(): string {
    return `(
      project_id IS NULL
      AND (
        (
          entity_type = 'document'
          AND EXISTS (
            SELECT 1
            FROM documents d
            WHERE d.id = global_search_fts.entity_id
              AND d.status = 'published'
          )
        )
        OR
        (
          entity_type = 'release'
          AND EXISTS (
            SELECT 1
            FROM releases r
            WHERE r.id = global_search_fts.entity_id
              AND r.status = 'published'
          )
        )
      )
    )`;
  }
}
