import type Database from "better-sqlite3";
import type { SearchEntityType } from "./search.types";

type SearchRepoInput = {
  matchExpression: string;
  rawKeyword: string;
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
  private static readonly SUBSTRING_FALLBACK_SCORE = 999999;
  private ftsMetadata: { hasStatusColumn: boolean; bodyColumnIndex: number } | null = null;

  constructor(private readonly db: Database.Database) {}

  search(input: SearchRepoInput): SearchRepoResult {
    const keyword = input.rawKeyword.trim();
    if (!input.matchExpression.trim() && keyword.length < 2) {
      return { items: [], total: 0 };
    }

    if (input.projectIds.length === 0 && !input.includeGlobalProjectNull) {
      return { items: [], total: 0 };
    }

    const fts = this.getFtsMetadata();
    const scopeWhere = this.buildScopeWhere(input, fts.hasStatusColumn);
    const items: SearchRow[] = [];
    const existingKeys = new Set<string>();
    let total = 0;

    if (input.matchExpression.trim()) {
      const ftsWhereSql = ["global_search_fts MATCH ?", ...scopeWhere.conditions].join(" AND ");
      const ftsCountParams: unknown[] = [input.matchExpression, ...scopeWhere.params];
      const countSql = `SELECT COUNT(1) AS total FROM global_search_fts WHERE ${ftsWhereSql}`;
      const totalRow = this.db.prepare(countSql).get(...ftsCountParams) as { total: number } | undefined;
      const ftsTotal = totalRow?.total ?? 0;
      total += ftsTotal;

      if (ftsTotal > 0 && input.limit > 0) {
        const sql = `
          SELECT
            entity_type,
            entity_id,
            project_id,
            title,
            COALESCE(NULLIF(snippet(global_search_fts, ${fts.bodyColumnIndex}, '', '', ' ... ', 14), ''), title) AS snippet,
            updated_at,
            bm25(global_search_fts, ${SearchRepo.TITLE_WEIGHT}, ${SearchRepo.BODY_WEIGHT}) AS score
          FROM global_search_fts
          WHERE ${ftsWhereSql}
          ORDER BY score ASC, updated_at DESC
          LIMIT ?
        `;
        const rows = this.db
          .prepare(sql)
          .all(...ftsCountParams, input.limit) as SearchRow[];
        for (const row of rows) {
          items.push(row);
          existingKeys.add(this.buildEntityKey(row.entity_type, row.entity_id));
        }
      }
    }

    if (this.shouldRunSubstringFallback(keyword)) {
      const fallbackInfo = this.loadSubstringFallbackRows({
        input,
        keyword,
        scopeWhere,
        existingKeys
      });
      total = this.mergeTotalWithFallback(
        total,
        fallbackInfo.fallbackTotal,
        fallbackInfo.overlapWithFts
      );

      if (input.limit > items.length) {
        for (const row of fallbackInfo.rows) {
          if (items.length >= input.limit) {
            break;
          }
          const key = this.buildEntityKey(row.entity_type, row.entity_id);
          if (existingKeys.has(key)) {
            continue;
          }
          items.push(row);
          existingKeys.add(key);
        }
      }
    }

    if (items.length === 0 || total <= 0) {
      return { items: [], total: 0 };
    }

    return {
      items: items.map((row) => ({
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

  private buildScopeWhere(
    input: SearchRepoInput,
    hasStatusColumn: boolean
  ): { conditions: string[]; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (input.projectIds.length > 0 && input.includeGlobalProjectNull) {
      if (input.globalProjectNullPublishedOnly) {
        conditions.push(
          `(project_id IN (${input.projectIds.map(() => "?").join(",")}) OR ${this.buildGlobalPublishedNullFilter(hasStatusColumn)})`
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
          ? this.buildGlobalPublishedNullFilter(hasStatusColumn)
          : "project_id IS NULL"
      );
    }

    if (input.types && input.types.length > 0) {
      conditions.push(`entity_type IN (${input.types.map(() => "?").join(",")})`);
      params.push(...input.types);
    }

    return { conditions, params };
  }

  private loadSubstringFallbackRows(options: {
    input: SearchRepoInput;
    keyword: string;
    scopeWhere: { conditions: string[]; params: unknown[] };
    existingKeys: Set<string>;
  }): {
    rows: SearchRow[];
    fallbackTotal: number;
    overlapWithFts: number;
  } {
    const { input, keyword, scopeWhere, existingKeys } = options;
    const remainingLimit = Math.max(input.limit - existingKeys.size, 0);
    if (remainingLimit <= 0) {
      return { rows: [], fallbackTotal: 0, overlapWithFts: 0 };
    }

    const textMatchCondition = "(instr(title, ?) > 0 OR instr(body, ?) > 0)";
    const fallbackConditions = [...scopeWhere.conditions, textMatchCondition];
    const fallbackWhereSql = fallbackConditions.join(" AND ");
    const fallbackParams: unknown[] = [...scopeWhere.params, keyword, keyword];

    const fallbackCountSql = `SELECT COUNT(1) AS total FROM global_search_fts WHERE ${fallbackWhereSql}`;
    const fallbackCountRow = this.db.prepare(fallbackCountSql).get(...fallbackParams) as
      | { total: number }
      | undefined;
    const fallbackTotal = fallbackCountRow?.total ?? 0;
    if (fallbackTotal <= 0) {
      return { rows: [], fallbackTotal: 0, overlapWithFts: 0 };
    }

    let overlapWithFts = 0;
    if (input.matchExpression.trim()) {
      const overlapConditions = ["global_search_fts MATCH ?", ...fallbackConditions];
      const overlapWhereSql = overlapConditions.join(" AND ");
      const overlapSql = `SELECT COUNT(1) AS total FROM global_search_fts WHERE ${overlapWhereSql}`;
      const overlapRow = this.db
        .prepare(overlapSql)
        .get(input.matchExpression, ...fallbackParams) as { total: number } | undefined;
      overlapWithFts = overlapRow?.total ?? 0;
    }

    const fallbackSql = `
      SELECT
        entity_type,
        entity_id,
        project_id,
        title,
        COALESCE(NULLIF(trim(substr(coalesce(body, ''), 1, 160)), ''), title) AS snippet,
        updated_at,
        ${SearchRepo.SUBSTRING_FALLBACK_SCORE} AS score
      FROM global_search_fts
      WHERE ${fallbackWhereSql}
      ORDER BY updated_at DESC
      LIMIT ?
    `;
    const fallbackRows = this.db
      .prepare(fallbackSql)
      .all(...fallbackParams, Math.max(remainingLimit * 4, remainingLimit)) as SearchRow[];

    return {
      rows: fallbackRows,
      fallbackTotal,
      overlapWithFts
    };
  }

  private mergeTotalWithFallback(ftsTotal: number, fallbackTotal: number, overlapWithFts: number): number {
    if (fallbackTotal <= 0) {
      return ftsTotal;
    }
    if (ftsTotal <= 0) {
      return fallbackTotal;
    }
    const merged = ftsTotal + fallbackTotal - overlapWithFts;
    return merged > 0 ? merged : ftsTotal;
  }

  private shouldRunSubstringFallback(keyword: string): boolean {
    return /[\p{Script=Han}]/u.test(keyword);
  }

  private buildEntityKey(entityType: SearchEntityType, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  private buildGlobalPublishedNullFilter(hasStatusColumn: boolean): string {
    if (hasStatusColumn) {
      return `(
        project_id IS NULL
        AND entity_type IN ('document', 'release')
        AND status = 'published'
      )`;
    }
    return `(
      project_id IS NULL
      AND (
        (entity_type = 'document' AND EXISTS (
          SELECT 1 FROM documents d WHERE d.id = entity_id AND d.status = 'published'
        ))
        OR
        (entity_type = 'release' AND EXISTS (
          SELECT 1 FROM releases r WHERE r.id = entity_id AND r.status = 'published'
        ))
      )
    )`;
  }

  private getFtsMetadata(): { hasStatusColumn: boolean; bodyColumnIndex: number } {
    if (this.ftsMetadata) {
      return this.ftsMetadata;
    }

    try {
      const rows = this.db.prepare("PRAGMA table_info(global_search_fts)").all() as Array<{ name: string }>;
      const columnNames = rows.map((row) => row.name);
      const hasStatusColumn = columnNames.includes("status");
      const bodyColumnIndex = Math.max(columnNames.indexOf("body"), 0);
      this.ftsMetadata = {
        hasStatusColumn,
        bodyColumnIndex
      };
    } catch {
      this.ftsMetadata = {
        hasStatusColumn: false,
        bodyColumnIndex: 4
      };
    }

    return this.ftsMetadata;
  }
}
