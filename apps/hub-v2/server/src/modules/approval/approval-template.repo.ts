import type Database from "better-sqlite3";
import type {
  ApprovalResolverType,
  ApprovalStageType,
  ApprovalTemplateDetail,
  ApprovalTemplateEntity,
  ApprovalTemplateStageEntity,
  ApprovalTemplateStatus,
  ListApprovalTemplatesQuery
} from "./approval-template.types";

type TemplateRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ApprovalTemplateStatus;
  created_at: string;
  updated_at: string;
};

type StageRow = {
  id: string;
  template_id: string;
  stage_code: string;
  stage_name: string;
  stage_type: ApprovalStageType;
  resolver_type: ApprovalResolverType;
  resolver_ref: string | null;
  sort: number;
  created_at: string;
  updated_at: string;
};

export class ApprovalTemplateRepo {
  constructor(private readonly db: Database.Database) {}

  list(query: ListApprovalTemplatesQuery = {}): ApprovalTemplateDetail[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      conditions.push("(code LIKE ? OR name LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT id, code, name, description, status, created_at, updated_at FROM approval_templates ${whereClause} ORDER BY created_at DESC`)
      .all(...params) as TemplateRow[];
    return rows.map((row) => this.withStages(this.mapTemplate(row)));
  }

  findById(id: string): ApprovalTemplateDetail | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, status, created_at, updated_at FROM approval_templates WHERE id = ?")
      .get(id) as TemplateRow | undefined;
    return row ? this.withStages(this.mapTemplate(row)) : null;
  }

  findByCode(code: string): ApprovalTemplateEntity | null {
    const row = this.db
      .prepare("SELECT id, code, name, description, status, created_at, updated_at FROM approval_templates WHERE code = ?")
      .get(code) as TemplateRow | undefined;
    return row ? this.mapTemplate(row) : null;
  }

  create(template: ApprovalTemplateEntity, stages: ApprovalTemplateStageEntity[]): void {
    const transaction = this.db.transaction(() => {
      this.db
        .prepare("INSERT INTO approval_templates (id, code, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(template.id, template.code, template.name, template.description, template.status, template.createdAt, template.updatedAt);
      this.replaceStages(template.id, stages);
    });
    transaction();
  }

  update(template: ApprovalTemplateEntity, stages?: ApprovalTemplateStageEntity[]): void {
    const transaction = this.db.transaction(() => {
      this.db
        .prepare("UPDATE approval_templates SET code = ?, name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?")
        .run(template.code, template.name, template.description, template.status, template.updatedAt, template.id);
      if (stages) {
        this.replaceStages(template.id, stages);
      }
    });
    transaction();
  }

  systemRoleExists(roleId: string): boolean {
    const row = this.db.prepare("SELECT 1 FROM system_roles WHERE id = ? AND status = 'active'").get(roleId) as { 1: number } | undefined;
    return !!row;
  }

  private replaceStages(templateId: string, stages: ApprovalTemplateStageEntity[]): void {
    this.db.prepare("DELETE FROM approval_template_stages WHERE template_id = ?").run(templateId);
    if (stages.length === 0) {
      return;
    }
    const insert = this.db.prepare(`
      INSERT INTO approval_template_stages (
        id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const stage of stages) {
      insert.run(
        stage.id,
        templateId,
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
  }

  private listStages(templateId: string): ApprovalTemplateStageEntity[] {
    const rows = this.db
      .prepare(`
        SELECT id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at, updated_at
        FROM approval_template_stages
        WHERE template_id = ?
        ORDER BY sort ASC, created_at ASC
      `)
      .all(templateId) as StageRow[];
    return rows.map((row) => ({
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
    }));
  }

  private withStages(template: ApprovalTemplateEntity): ApprovalTemplateDetail {
    return {
      ...template,
      stages: this.listStages(template.id)
    };
  }

  private mapTemplate(row: TemplateRow): ApprovalTemplateEntity {
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
}
