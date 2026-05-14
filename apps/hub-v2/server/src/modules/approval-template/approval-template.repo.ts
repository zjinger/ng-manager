import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ApprovalTemplateEntity,
  ApprovalTemplateListResult,
  ApprovalTemplateStageEntity,
  ListApprovalTemplatesQuery
} from "./approval-template.types";

type ApprovalTemplateRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

type ApprovalTemplateStageRow = {
  id: string;
  template_id: string;
  stage_code: string;
  stage_name: string;
  stage_type: ApprovalTemplateStageEntity["stageType"];
  resolver_type: ApprovalTemplateStageEntity["resolverType"];
  resolver_ref: string | null;
  sort: number;
  created_at: string;
  updated_at: string;
};

export class ApprovalTemplateRepo {
  constructor(private readonly db: Database.Database) {}

  findById(id: string): ApprovalTemplateEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, status, created_at, updated_at FROM approval_templates WHERE id = ?")
      .get(id) as ApprovalTemplateRow | undefined;
    return row ? this.mapTemplate(row) : null;
  }

  findByCode(code: string): ApprovalTemplateEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, status, created_at, updated_at FROM approval_templates WHERE code = ?")
      .get(code) as ApprovalTemplateRow | undefined;
    return row ? this.mapTemplate(row) : null;
  }

  list(query: ListApprovalTemplatesQuery): ApprovalTemplateListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      conditions.push("(code LIKE ? OR name LIKE ? OR description LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = this.db.prepare(`SELECT COUNT(*) AS cnt FROM approval_templates ${whereClause}`).get(...params) as { cnt: number };
    const rows = this.db
      .prepare(
        `SELECT id, code, name, description, status, created_at, updated_at
         FROM approval_templates
         ${whereClause}
         ORDER BY updated_at DESC, created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset) as ApprovalTemplateRow[];

    return {
      items: rows.map((row) => this.mapTemplate(row)),
      page,
      pageSize,
      total: total.cnt
    };
  }

  createTemplate(entity: ApprovalTemplateEntity): void {
    this.db
      .prepare("INSERT INTO approval_templates (id, code, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(entity.id, entity.code, entity.name, entity.description, entity.status, entity.createdAt, entity.updatedAt);
  }

  updateTemplate(entity: ApprovalTemplateEntity): void {
    this.db
      .prepare("UPDATE approval_templates SET code = ?, name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?")
      .run(entity.code, entity.name, entity.description, entity.status, entity.updatedAt, entity.id);
  }

  listStages(templateId: string): ApprovalTemplateStageEntity[] {
    const rows = this.db
      .prepare(
        `SELECT id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at, updated_at
         FROM approval_template_stages
         WHERE template_id = ?
         ORDER BY sort ASC, created_at ASC`
      )
      .all(templateId) as ApprovalTemplateStageRow[];
    return rows.map((row) => this.mapStage(row));
  }

  replaceStages(templateId: string, stages: ApprovalTemplateStageEntity[]): void {
    const tx = this.db.transaction(() => {
      this.db.prepare("DELETE FROM approval_template_stages WHERE template_id = ?").run(templateId);
      const insert = this.db.prepare(
        `INSERT INTO approval_template_stages (
           id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const stage of stages) {
        insert.run(
          stage.id,
          stage.templateId,
          stage.stageCode,
          stage.stageName,
          stage.stageType,
          stage.resolverType,
          stage.resolverRef,
          stage.sort,
          stage.createdAt,
          stage.updatedAt
        );
      }
    });
    tx();
  }

  roleExists(roleId: string): boolean {
    const row = this.db.prepare("SELECT id FROM system_roles WHERE id = ?").get(roleId) as { id: string } | undefined;
    return !!row;
  }

  private mapTemplate(row: ApprovalTemplateRow): ApprovalTemplateEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapStage(row: ApprovalTemplateStageRow): ApprovalTemplateStageEntity {
    return {
      id: row.id,
      templateId: row.template_id,
      stageCode: row.stage_code,
      stageName: row.stage_name,
      stageType: row.stage_type,
      resolverType: row.resolver_type,
      resolverRef: row.resolver_ref,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
