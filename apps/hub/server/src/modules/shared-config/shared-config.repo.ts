import type Database from "better-sqlite3";
import type {
  ListSharedConfigQuery,
  SharedConfigEntity
} from "./shared-config.types";

type SharedConfigRow = {
  id: string;
  config_key: string;
  config_value: string;
  value_type: string;
  scope: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export class SharedConfigRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: SharedConfigEntity): void {
    const stmt = this.db.prepare(`
      INSERT INTO shared_configs (
        id, config_key, config_value, value_type, scope, description, created_at, updated_at
      ) VALUES (
        @id, @config_key, @config_value, @value_type, @scope, @description, @created_at, @updated_at
      )
    `);

    stmt.run({
      id: entity.id,
      config_key: entity.configKey,
      config_value: entity.configValue,
      value_type: entity.valueType,
      scope: entity.scope,
      description: entity.description ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    });
  }

  findById(id: string): SharedConfigEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM shared_configs WHERE id = ?`)
      .get(id) as SharedConfigRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findByKey(configKey: string): SharedConfigEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM shared_configs WHERE config_key = ?`)
      .get(configKey) as SharedConfigRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  findPublicByKey(configKey: string): SharedConfigEntity | null {
    const row = this.db
      .prepare(`SELECT * FROM shared_configs WHERE config_key = ? AND scope = 'public'`)
      .get(configKey) as SharedConfigRow | undefined;

    return row ? this.toEntity(row) : null;
  }

  update(
    id: string,
    patch: {
      configValue?: string;
      valueType?: SharedConfigEntity["valueType"];
      scope?: SharedConfigEntity["scope"];
      description?: string | null;
      updatedAt: string;
    }
  ): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.configValue !== undefined) {
      fields.push("config_value = ?");
      params.push(patch.configValue);
    }

    if (patch.valueType !== undefined) {
      fields.push("value_type = ?");
      params.push(patch.valueType);
    }

    if (patch.scope !== undefined) {
      fields.push("scope = ?");
      params.push(patch.scope);
    }

    if (patch.description !== undefined) {
      fields.push("description = ?");
      params.push(patch.description ?? null);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(id);

    const result = this.db
      .prepare(`UPDATE shared_configs SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return result.changes > 0;
  }

  remove(id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM shared_configs WHERE id = ?`)
      .run(id);

    return result.changes > 0;
  }

  list(query: ListSharedConfigQuery): {
    items: SharedConfigEntity[];
    page: number;
    pageSize: number;
    total: number;
  } {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.scope) {
      where.push("scope = ?");
      params.push(query.scope);
    }

    if (query.keyword) {
      where.push("(config_key LIKE ? OR description LIKE ? OR config_value LIKE ?)");
      params.push(
        `%${query.keyword}%`,
        `%${query.keyword}%`,
        `%${query.keyword}%`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.pageSize;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM shared_configs ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`
        SELECT *
        FROM shared_configs
        ${whereSql}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, query.pageSize, offset) as SharedConfigRow[];

    return {
      items: rows.map((row) => this.toEntity(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  listPublic(): SharedConfigEntity[] {
    const rows = this.db
      .prepare(`
        SELECT *
        FROM shared_configs
        WHERE scope = 'public'
        ORDER BY config_key ASC
      `)
      .all() as SharedConfigRow[];

    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: SharedConfigRow): SharedConfigEntity {
    return {
      id: row.id,
      configKey: row.config_key,
      configValue: row.config_value,
      valueType: row.value_type as SharedConfigEntity["valueType"],
      scope: row.scope as SharedConfigEntity["scope"],
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}