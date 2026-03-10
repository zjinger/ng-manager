import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  CreateSharedConfigInput,
  ListSharedConfigQuery,
  SharedConfigEntity,
  SharedConfigListResult,
  SharedConfigScope,
  UpdateSharedConfigInput
} from "./shared-config.types";

function mapRow(row: any): SharedConfigEntity {
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    scope: row.scope,
    configKey: row.config_key,
    configName: row.config_name,
    category: row.category,
    valueType: row.value_type,
    configValue: row.config_value,
    description: row.description ?? "",
    isEncrypted: !!row.is_encrypted,
    priority: Number(row.priority ?? 0),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SharedConfigRepo {
  constructor(private readonly db: Database.Database) { }

  create(input: Required<CreateSharedConfigInput> & { scope: SharedConfigScope; projectId: string | null }) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO shared_config (
        id,
        project_id,
        scope,
        config_key,
        config_name,
        category,
        value_type,
        config_value,
        description,
        is_encrypted,
        priority,
        status,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @projectId,
        @scope,
        @configKey,
        @configName,
        @category,
        @valueType,
        @configValue,
        @description,
        @isEncrypted,
        @priority,
        @status,
        @createdAt,
        @updatedAt
      )
    `).run({
      id,
      projectId: input.projectId,
      scope: input.scope,
      configKey: input.configKey,
      configName: input.configName,
      category: input.category,
      valueType: input.valueType,
      configValue: input.configValue,
      description: input.description,
      isEncrypted: input.isEncrypted ? 1 : 0,
      priority: input.priority,
      status: input.status,
      createdAt: now,
      updatedAt: now
    });

    return this.getById(id)!;
  }

  update(id: string, input: UpdateSharedConfigInput) {
    const sets: string[] = [];
    const params: Record<string, unknown> = {
      id,
      updatedAt: new Date().toISOString()
    };

    if (input.configName !== undefined) {
      sets.push("config_name = @configName");
      params.configName = input.configName;
    }
    if (input.category !== undefined) {
      sets.push("category = @category");
      params.category = input.category;
    }
    if (input.valueType !== undefined) {
      sets.push("value_type = @valueType");
      params.valueType = input.valueType;
    }
    if (input.configValue !== undefined) {
      sets.push("config_value = @configValue");
      params.configValue = input.configValue;
    }
    if (input.description !== undefined) {
      sets.push("description = @description");
      params.description = input.description;
    }
    if (input.isEncrypted !== undefined) {
      sets.push("is_encrypted = @isEncrypted");
      params.isEncrypted = input.isEncrypted ? 1 : 0;
    }
    if (input.priority !== undefined) {
      sets.push("priority = @priority");
      params.priority = input.priority;
    }
    if (input.status !== undefined) {
      sets.push("status = @status");
      params.status = input.status;
    }

    if (!sets.length) {
      return this.getById(id);
    }

    sets.push("updated_at = @updatedAt");

    this.db.prepare(`
      UPDATE shared_config
      SET ${sets.join(", ")}
      WHERE id = @id
    `).run(params);

    return this.getById(id);
  }

  getById(id: string): SharedConfigEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM shared_config
      WHERE id = ?
      LIMIT 1
    `).get(id);

    return row ? mapRow(row) : null;
  }

  getByProjectAndKey(projectId: string | null, configKey: string): SharedConfigEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM shared_config
      WHERE project_id IS ?
        AND config_key = ?
      LIMIT 1
    `).get(projectId, configKey);

    return row ? mapRow(row) : null;
  }

  list(query: ListSharedConfigQuery): SharedConfigListResult {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const where: string[] = ["1 = 1"];
    const params: Record<string, unknown> = {
      limit: pageSize,
      offset
    };

    if (query.projectId) {
      where.push("project_id = @projectId");
      params.projectId = query.projectId;
    }

    if (query.scope) {
      where.push("scope = @scope");
      params.scope = query.scope;
    }

    if (query.category) {
      where.push("category = @category");
      params.category = query.category;
    }

    if (query.status) {
      where.push("status = @status");
      params.status = query.status;
    }

    if (query.keyword) {
      where.push("(config_key LIKE @keyword OR config_name LIKE @keyword OR description LIKE @keyword)");
      params.keyword = `%${query.keyword}%`;
    }

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM shared_config
      WHERE ${where.join(" AND ")}
    `).get(params) as { total: number };

    const rows = this.db.prepare(`
      SELECT *
      FROM shared_config
      WHERE ${where.join(" AND ")}
      ORDER BY
        CASE scope WHEN 'project' THEN 0 ELSE 1 END,
        priority DESC,
        updated_at DESC
      LIMIT @limit OFFSET @offset
    `).all(params);

    return {
      list: rows.map(mapRow),
      total: totalRow.total,
      page,
      pageSize
    };
  }

  resolve(projectId?: string, category?: string): SharedConfigEntity[] {
    const where: string[] = ["status = 'active'"];
    const params: Record<string, unknown> = {};

    if (category) {
      where.push("category = @category");
      params.category = category;
    }

    let scopeSql = `scope = 'global'`;
    if (projectId) {
      scopeSql = `(scope = 'global' OR (scope = 'project' AND project_id = @projectId))`;
      params.projectId = projectId;
    }

    const rows = this.db.prepare(`
      SELECT *
      FROM shared_config
      WHERE ${where.join(" AND ")}
        AND ${scopeSql}
      ORDER BY
        CASE scope WHEN 'project' THEN 0 ELSE 1 END,
        priority DESC,
        updated_at DESC
    `).all(params);

    const map = new Map<string, SharedConfigEntity>();

    for (const row of rows) {
      const item = mapRow(row);
      if (!map.has(item.configKey)) {
        map.set(item.configKey, item);
      }
    }

    return Array.from(map.values());
  }

  remove(id: string) {
    this.db.prepare(`
      DELETE FROM shared_config
      WHERE id = ?
    `).run(id);
  }
}