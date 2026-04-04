import type Database from "better-sqlite3";
import type {
  ReportPublicBoardEntity,
  ReportPublicBoardItemSnapshotEntity,
  ReportPublicBoardSummaryEntity,
  ReportPublicProjectEntity,
  ReportPublicTemplateEntity
} from "./report-public.types";

type ReportPublicProjectRow = {
  id: string;
  project_id: string;
  project_name: string;
  project_key: string;
  project_description: string | null;
  share_token: string;
  allow_all_projects: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ReportPublicTemplateRow = {
  id: string;
  project_id: string;
  share_token: string;
  title: string;
  natural_query: string;
  created_at: string;
};

type ReportPublicBoardRow = {
  id: string;
  title: string;
  share_token: string;
  is_active: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ReportPublicBoardSummaryRow = {
  id: string;
  title: string;
  share_token: string;
  is_active: number;
  created_by: string;
  item_count: number;
  created_at: string;
  updated_at: string;
};

type ReportPublicBoardItemRow = {
  id: string;
  board_id: string;
  sort_order: number;
  title: string;
  natural_query: string;
  sql: string;
  params_json: string;
  blocks_json: string;
  layout_size: "compact" | "wide";
  created_at: string;
  updated_at: string;
};

export class ReportPublicRepo {
  constructor(private readonly db: Database.Database) {}

  listPublicProjects(): ReportPublicProjectEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            rpp.id,
            rpp.project_id,
            p.name AS project_name,
            p.project_key AS project_key,
            p.description AS project_description,
            rpp.share_token,
            rpp.allow_all_projects,
            rpp.created_by,
            rpp.created_at,
            rpp.updated_at
          FROM report_public_projects rpp
          INNER JOIN projects p ON p.id = rpp.project_id
          WHERE p.status = 'active'
          ORDER BY rpp.updated_at DESC
        `
      )
      .all() as ReportPublicProjectRow[];

    return rows.map((row) => this.mapProjectRow(row));
  }

  listPublicProjectsByIds(projectIds: string[]): ReportPublicProjectEntity[] {
    if (projectIds.length === 0) {
      return [];
    }

    const placeholders = projectIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `
          SELECT
            rpp.id,
            rpp.project_id,
            p.name AS project_name,
            p.project_key AS project_key,
            p.description AS project_description,
            rpp.share_token,
            rpp.allow_all_projects,
            rpp.created_by,
            rpp.created_at,
            rpp.updated_at
          FROM report_public_projects rpp
          INNER JOIN projects p ON p.id = rpp.project_id
          WHERE rpp.project_id IN (${placeholders}) AND p.status = 'active'
          ORDER BY rpp.updated_at DESC
        `
      )
      .all(...projectIds) as ReportPublicProjectRow[];

    return rows.map((row) => this.mapProjectRow(row));
  }

  findPublicProjectById(id: string): ReportPublicProjectEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            rpp.id,
            rpp.project_id,
            p.name AS project_name,
            p.project_key AS project_key,
            p.description AS project_description,
            rpp.share_token,
            rpp.allow_all_projects,
            rpp.created_by,
            rpp.created_at,
            rpp.updated_at
          FROM report_public_projects rpp
          INNER JOIN projects p ON p.id = rpp.project_id
          WHERE rpp.id = ? AND p.status = 'active'
          LIMIT 1
        `
      )
      .get(id) as ReportPublicProjectRow | undefined;

    return row ? this.mapProjectRow(row) : null;
  }

  findPublicProjectByProjectId(projectId: string): ReportPublicProjectEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            rpp.id,
            rpp.project_id,
            p.name AS project_name,
            p.project_key AS project_key,
            p.description AS project_description,
            rpp.share_token,
            rpp.allow_all_projects,
            rpp.created_by,
            rpp.created_at,
            rpp.updated_at
          FROM report_public_projects rpp
          INNER JOIN projects p ON p.id = rpp.project_id
          WHERE rpp.project_id = ? AND p.status = 'active'
          LIMIT 1
        `
      )
      .get(projectId) as ReportPublicProjectRow | undefined;

    return row ? this.mapProjectRow(row) : null;
  }

  findPublicProjectByShareToken(shareToken: string): ReportPublicProjectEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            rpp.id,
            rpp.project_id,
            p.name AS project_name,
            p.project_key AS project_key,
            p.description AS project_description,
            rpp.share_token,
            rpp.allow_all_projects,
            rpp.created_by,
            rpp.created_at,
            rpp.updated_at
          FROM report_public_projects rpp
          INNER JOIN projects p ON p.id = rpp.project_id
          WHERE rpp.share_token = ? AND p.status = 'active'
          LIMIT 1
        `
      )
      .get(shareToken) as ReportPublicProjectRow | undefined;

    return row ? this.mapProjectRow(row) : null;
  }

  createPublicProject(input: {
    id: string;
    projectId: string;
    shareToken: string;
    allowAllProjects: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }): void {
    this.db
      .prepare(
        `
          INSERT INTO report_public_projects (
            id, project_id, share_token, allow_all_projects, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        input.id,
        input.projectId,
        input.shareToken,
        input.allowAllProjects ? 1 : 0,
        input.createdBy,
        input.createdAt,
        input.updatedAt
      );
  }

  updatePublicProject(id: string, patch: { allowAllProjects?: boolean; updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.allowAllProjects !== undefined) {
      fields.push("allow_all_projects = ?");
      params.push(patch.allowAllProjects ? 1 : 0);
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt, id);

    const result = this.db
      .prepare(`UPDATE report_public_projects SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return result.changes > 0;
  }

  updateShareTokenById(id: string, shareToken: string, updatedAt: string): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE report_public_projects
          SET share_token = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(shareToken, updatedAt, id);

    return result.changes > 0;
  }

  deletePublicProjectById(id: string): boolean {
    const result = this.db.prepare("DELETE FROM report_public_projects WHERE id = ?").run(id);
    return result.changes > 0;
  }

  listPublicProjectIds(): string[] {
    const rows = this.db
      .prepare("SELECT project_id FROM report_public_projects")
      .all() as Array<{ project_id: string }>;
    return rows.map((row) => row.project_id);
  }

  findPublicTemplateById(id: string): ReportPublicTemplateEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT id, project_id, share_token, title, natural_query, created_at
          FROM report_public_templates
          WHERE id = ?
          LIMIT 1
        `
      )
      .get(id) as ReportPublicTemplateRow | undefined;
    return row ? this.mapTemplateRow(row) : null;
  }

  findPublicBoardByShareToken(shareToken: string): ReportPublicBoardEntity | null {
    const boardRow = this.db
      .prepare(
        `
          SELECT id, title, share_token, is_active, created_by, created_at, updated_at
          FROM report_public_boards
          WHERE share_token = ? AND is_active = 1
          LIMIT 1
        `
      )
      .get(shareToken) as ReportPublicBoardRow | undefined;
    if (!boardRow) {
      return null;
    }
    const itemRows = this.db
      .prepare(
        `
          SELECT id, board_id, sort_order, title, natural_query, sql, params_json, blocks_json, layout_size, created_at, updated_at
          FROM report_public_board_items
          WHERE board_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all(boardRow.id) as ReportPublicBoardItemRow[];

    return this.mapBoardRow(boardRow, itemRows);
  }

  listPublicBoardsByCreator(createdBy: string): ReportPublicBoardSummaryEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            b.id,
            b.title,
            b.share_token,
            b.is_active,
            b.created_by,
            COUNT(i.id) AS item_count,
            b.created_at,
            b.updated_at
          FROM report_public_boards b
          LEFT JOIN report_public_board_items i ON i.board_id = b.id
          WHERE b.created_by = ?
          GROUP BY b.id, b.title, b.share_token, b.is_active, b.created_by, b.created_at, b.updated_at
          ORDER BY b.updated_at DESC
        `
      )
      .all(createdBy) as ReportPublicBoardSummaryRow[];
    return rows.map((row) => this.mapBoardSummaryRow(row));
  }

  listPublicBoards(): ReportPublicBoardSummaryEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            b.id,
            b.title,
            b.share_token,
            b.is_active,
            b.created_by,
            COUNT(i.id) AS item_count,
            b.created_at,
            b.updated_at
          FROM report_public_boards b
          LEFT JOIN report_public_board_items i ON i.board_id = b.id
          GROUP BY b.id, b.title, b.share_token, b.is_active, b.created_by, b.created_at, b.updated_at
          ORDER BY b.updated_at DESC
        `
      )
      .all() as ReportPublicBoardSummaryRow[];
    return rows.map((row) => this.mapBoardSummaryRow(row));
  }

  findPublicBoardSummaryById(id: string): ReportPublicBoardSummaryEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT
            b.id,
            b.title,
            b.share_token,
            b.is_active,
            b.created_by,
            COUNT(i.id) AS item_count,
            b.created_at,
            b.updated_at
          FROM report_public_boards b
          LEFT JOIN report_public_board_items i ON i.board_id = b.id
          WHERE b.id = ?
          GROUP BY b.id, b.title, b.share_token, b.is_active, b.created_by, b.created_at, b.updated_at
          LIMIT 1
        `
      )
      .get(id) as ReportPublicBoardSummaryRow | undefined;
    return row ? this.mapBoardSummaryRow(row) : null;
  }

  createPublicBoard(input: {
    id: string;
    title: string;
    shareToken: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      sortOrder: number;
      title: string;
      naturalQuery: string;
      sql: string;
      params: string[];
      blocks: unknown[];
      layoutSize: "compact" | "wide";
      createdAt: string;
      updatedAt: string;
    }>;
  }): void {
    const insertBoardStmt = this.db.prepare(
      `
        INSERT INTO report_public_boards (
          id, title, share_token, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    );
    const insertItemStmt = this.db.prepare(
      `
        INSERT INTO report_public_board_items (
          id, board_id, sort_order, title, natural_query, sql, params_json, blocks_json, layout_size, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    const tx = this.db.transaction(() => {
      insertBoardStmt.run(
        input.id,
        input.title,
        input.shareToken,
        1,
        input.createdBy,
        input.createdAt,
        input.updatedAt
      );
      for (const item of input.items) {
        insertItemStmt.run(
          item.id,
          input.id,
          item.sortOrder,
          item.title,
          item.naturalQuery,
          item.sql,
          JSON.stringify(item.params),
          JSON.stringify(item.blocks),
          item.layoutSize,
          item.createdAt,
          item.updatedAt
        );
      }
    });

    tx();
  }

  updateBoardShareTokenById(id: string, shareToken: string, updatedAt: string): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE report_public_boards
          SET share_token = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(shareToken, updatedAt, id);
    return result.changes > 0;
  }

  updateBoardActiveById(id: string, isActive: boolean, updatedAt: string): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE report_public_boards
          SET is_active = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(isActive ? 1 : 0, updatedAt, id);
    return result.changes > 0;
  }

  deletePublicBoardById(id: string): boolean {
    const result = this.db.prepare("DELETE FROM report_public_boards WHERE id = ?").run(id);
    return result.changes > 0;
  }

  private mapProjectRow(row: ReportPublicProjectRow): ReportPublicProjectEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      projectKey: row.project_key,
      projectDescription: row.project_description,
      shareToken: row.share_token,
      allowAllProjects: row.allow_all_projects === 1,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapTemplateRow(row: ReportPublicTemplateRow): ReportPublicTemplateEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      shareToken: row.share_token,
      title: row.title,
      naturalQuery: row.natural_query,
      createdAt: row.created_at
    };
  }

  private mapBoardRow(
    boardRow: ReportPublicBoardRow,
    itemRows: ReportPublicBoardItemRow[]
  ): ReportPublicBoardEntity {
    const items = itemRows.map((row) => this.mapBoardItemRow(row));
    return {
      id: boardRow.id,
      title: boardRow.title,
      shareToken: boardRow.share_token,
      isActive: boardRow.is_active === 1,
      createdBy: boardRow.created_by,
      createdAt: boardRow.created_at,
      updatedAt: boardRow.updated_at,
      items
    };
  }

  private mapBoardItemRow(row: ReportPublicBoardItemRow): ReportPublicBoardItemSnapshotEntity {
    return {
      id: row.id,
      boardId: row.board_id,
      sortOrder: row.sort_order,
      title: row.title,
      naturalQuery: row.natural_query,
      sql: row.sql,
      params: this.parseStringArray(row.params_json),
      blocks: this.parseJsonArray(row.blocks_json) as ReportPublicBoardItemSnapshotEntity["blocks"],
      layoutSize: row.layout_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapBoardSummaryRow(row: ReportPublicBoardSummaryRow): ReportPublicBoardSummaryEntity {
    return {
      id: row.id,
      title: row.title,
      shareToken: row.share_token,
      isActive: row.is_active === 1,
      createdBy: row.created_by,
      itemCount: Number(row.item_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private parseStringArray(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((item) => String(item));
    } catch {
      return [];
    }
  }

  private parseJsonArray(raw: string): unknown[] {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
