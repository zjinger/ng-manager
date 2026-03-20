import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListSharedConfigsQuery,
  PublicSharedConfigsQuery,
  SharedConfigEntity,
  SharedConfigListResult
} from "./shared-config.types";

type SharedConfigRow = {
  id: string;
  project_id: string | null;
  scope: "global" | "project";
  config_key: string;
  config_name: string;
  category: string;
  value_type: string;
  config_value: string;
  description: string | null;
  is_encrypted: number;
  priority: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export class SharedConfigRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: SharedConfigEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO shared_configs (
          id, project_id, scope, config_key, config_name, category, value_type, config_value,
          description, is_encrypted, priority, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.scope,
        entity.configKey,
        entity.configName,
        entity.category,
        entity.valueType,
        entity.configValue,
        entity.description,
        entity.isEncrypted ? 1 : 0,
        entity.priority,
        entity.status,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(id: string, changes: Partial<SharedConfigEntity>): boolean {
    const current = this.findById(id);
    if (!current) {
      return false;
    }

    const next: SharedConfigEntity = { ...current, ...changes };
    const result = this.db
      .prepare(
        `
        UPDATE shared_configs
        SET project_id = ?, scope = ?, config_key = ?, config_name = ?, category = ?, value_type = ?,
            config_value = ?, description = ?, is_encrypted = ?, priority = ?, status = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(
        next.projectId,
        next.scope,
        next.configKey,
        next.configName,
        next.category,
        next.valueType,
        next.configValue,
        next.description,
        next.isEncrypted ? 1 : 0,
        next.priority,
        next.status,
        next.createdAt,
        next.updatedAt,
        id
      );

    return result.changes > 0;
  }

  findById(id: string): SharedConfigEntity | null {
    const row = this.db
      .prepare("SELECT * FROM shared_configs WHERE id = ?")
      .get(id) as SharedConfigRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findByProjectAndKey(projectId: string | null, configKey: string): SharedConfigEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT * FROM shared_configs
          WHERE project_id IS ? AND config_key = ?
        `
      )
      .get(projectId, configKey) as SharedConfigRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  list(query: ListSharedConfigsQuery): SharedConfigListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }

    if (query.scope) {
      conditions.push("scope = ?");
      params.push(query.scope);
    }

    if (query.projectId?.trim()) {
      conditions.push("project_id = ?");
      params.push(query.projectId.trim());
    }

    if (query.category?.trim()) {
      conditions.push("category = ?");
      params.push(query.category.trim());
    }

    if (query.keyword?.trim()) {
      conditions.push("(config_key LIKE ? OR config_name LIKE ? OR description LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM shared_configs ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM shared_configs
          ${whereClause}
          ORDER BY priority DESC, updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as SharedConfigRow[];

    return {
      items: rows.map((row) => this.mapRow(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listPublic(query: PublicSharedConfigsQuery): SharedConfigEntity[] {
    const conditions: string[] = ["status = 'active'"];
    const params: unknown[] = [];

    if (query.projectId?.trim()) {
      conditions.push("(scope = 'global' OR project_id = ?)");
      params.push(query.projectId.trim());
    } else {
      conditions.push("scope = 'global'");
    }

    if (query.category?.trim()) {
      conditions.push("category = ?");
      params.push(query.category.trim());
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const rows = this.db
      .prepare(
        `
          SELECT * FROM shared_configs
          ${whereClause}
          ORDER BY priority DESC, updated_at DESC
        `
      )
      .all(...params) as SharedConfigRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: SharedConfigRow): SharedConfigEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      scope: row.scope,
      configKey: row.config_key,
      configName: row.config_name,
      category: row.category,
      valueType: row.value_type,
      configValue: row.config_value,
      description: row.description,
      isEncrypted: row.is_encrypted === 1,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
