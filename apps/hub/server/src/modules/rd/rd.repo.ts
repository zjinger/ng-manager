import type Database from "better-sqlite3";
import type {
  RdItemDetailResult,
  RdItemEntity,
  RdItemListResult,
  RdListQuery,
  RdLogEntity,
  RdOverview,
  RdStageEntity,
  UpdateRdItemPatch
} from "./rd.types";

type RdListFilters = Omit<RdListQuery, "projectId">;

type RdStageRow = {
  id: string;
  project_id: string;
  name: string;
  sort: number;
  enabled: number;
  created_at: string;
  updated_at: string;
};

type RdItemRow = {
  id: string;
  project_id: string;
  rd_no: string;
  title: string;
  description: string;
  stage_id: string;
  stage_name?: string | null;
  type: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  assignee_name: string | null;
  creator_id: string;
  creator_name: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  progress: number;
  plan_start_at: string | null;
  plan_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  blocker_reason: string | null;
  created_at: string;
  updated_at: string;
};

type RdLogRow = {
  id: string;
  project_id: string;
  item_id: string;
  action_type: string;
  content: string;
  operator_id: string | null;
  operator_name: string | null;
  created_at: string;
};

type OverviewRow = {
  total_count: number;
  doing_count: number;
  blocked_count: number;
  done_count: number;
  overdue_count: number;
};

export class RdRepo {
  constructor(private readonly db: Database.Database) {}

  runInTransaction<T>(handler: () => T): T {
    const tx = this.db.transaction(handler);
    return tx();
  }

  listStages(projectId: string): RdStageEntity[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM rd_stages
      WHERE project_id = ?
      ORDER BY enabled DESC, sort ASC, updated_at DESC, created_at DESC
    `).all(projectId) as RdStageRow[];

    return rows.map((row) => this.toStageEntity(row));
  }

  findStageById(projectId: string, stageId: string): RdStageEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM rd_stages
      WHERE project_id = ? AND id = ?
      LIMIT 1
    `).get(projectId, stageId) as RdStageRow | undefined;

    return row ? this.toStageEntity(row) : null;
  }

  createStage(entity: RdStageEntity): void {
    this.db.prepare(`
      INSERT INTO rd_stages (id, project_id, name, sort, enabled, created_at, updated_at)
      VALUES (@id, @project_id, @name, @sort, @enabled, @created_at, @updated_at)
    `).run({
      id: entity.id,
      project_id: entity.projectId,
      name: entity.name,
      sort: entity.sort,
      enabled: entity.enabled ? 1 : 0,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    });
  }

  updateStage(projectId: string, stageId: string, patch: Partial<Pick<RdStageEntity, "name" | "sort" | "enabled">> & { updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.name !== undefined) {
      fields.push("name = ?");
      params.push(patch.name);
    }
    if (patch.sort !== undefined) {
      fields.push("sort = ?");
      params.push(patch.sort);
    }
    if (patch.enabled !== undefined) {
      fields.push("enabled = ?");
      params.push(patch.enabled ? 1 : 0);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(projectId, stageId);

    const result = this.db.prepare(`
      UPDATE rd_stages
      SET ${fields.join(", ")}
      WHERE project_id = ? AND id = ?
    `).run(...params);

    return result.changes > 0;
  }

  deleteStage(projectId: string, stageId: string): boolean {
    const result = this.db.prepare(`DELETE FROM rd_stages WHERE project_id = ? AND id = ?`).run(projectId, stageId);
    return result.changes > 0;
  }

  countItemsByStage(projectId: string, stageId: string): number {
    const row = this.db.prepare(`
      SELECT COUNT(1) AS total
      FROM rd_items
      WHERE project_id = ? AND stage_id = ?
    `).get(projectId, stageId) as { total: number };

    return row.total;
  }

  getNextRdNo(projectId: string): string {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(CAST(SUBSTR(rd_no, 4) AS INTEGER)), 0) AS max_no
      FROM rd_items
      WHERE project_id = ? AND rd_no GLOB 'RD-[0-9]*'
    `).get(projectId) as { max_no: number };

    return `RD-${String((row.max_no ?? 0) + 1).padStart(3, "0")}`;
  }

  createItem(entity: RdItemEntity): void {
    this.db.prepare(`
      INSERT INTO rd_items (
        id, project_id, rd_no, title, description, stage_id, type, status, priority,
        assignee_id, assignee_name, creator_id, creator_name, reviewer_id, reviewer_name,
        progress, plan_start_at, plan_end_at, actual_start_at, actual_end_at, blocker_reason,
        created_at, updated_at
      ) VALUES (
        @id, @project_id, @rd_no, @title, @description, @stage_id, @type, @status, @priority,
        @assignee_id, @assignee_name, @creator_id, @creator_name, @reviewer_id, @reviewer_name,
        @progress, @plan_start_at, @plan_end_at, @actual_start_at, @actual_end_at, @blocker_reason,
        @created_at, @updated_at
      )
    `).run(this.toDbItemEntity(entity));
  }

  updateItem(projectId: string, itemId: string, patch: UpdateRdItemPatch): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];
    const mapper: Array<[keyof UpdateRdItemPatch, string]> = [
      ["title", "title"],
      ["description", "description"],
      ["stageId", "stage_id"],
      ["type", "type"],
      ["status", "status"],
      ["priority", "priority"],
      ["assigneeId", "assignee_id"],
      ["assigneeName", "assignee_name"],
      ["reviewerId", "reviewer_id"],
      ["reviewerName", "reviewer_name"],
      ["progress", "progress"],
      ["planStartAt", "plan_start_at"],
      ["planEndAt", "plan_end_at"],
      ["actualStartAt", "actual_start_at"],
      ["actualEndAt", "actual_end_at"],
      ["blockerReason", "blocker_reason"],
      ["updatedAt", "updated_at"]
    ];

    for (const [key, column] of mapper) {
      if (patch[key] !== undefined) {
        fields.push(`${column} = ?`);
        params.push(patch[key] ?? null);
      }
    }

    if (!fields.length) {
      return true;
    }

    params.push(projectId, itemId);
    const result = this.db.prepare(`
      UPDATE rd_items
      SET ${fields.join(", ")}
      WHERE project_id = ? AND id = ?
    `).run(...params);

    return result.changes > 0;
  }

  deleteItem(projectId: string, itemId: string): boolean {
    const result = this.db.prepare(`DELETE FROM rd_items WHERE project_id = ? AND id = ?`).run(projectId, itemId);
    return result.changes > 0;
  }

  findItemById(projectId: string, itemId: string): RdItemEntity | null {
    const row = this.db.prepare(`
      SELECT i.*, s.name AS stage_name
      FROM rd_items i
      LEFT JOIN rd_stages s ON s.id = i.stage_id
      WHERE i.project_id = ? AND i.id = ?
      LIMIT 1
    `).get(projectId, itemId) as RdItemRow | undefined;

    return row ? this.toItemEntity(row) : null;
  }

  listItems(query: RdListQuery): RdItemListResult {
    return this.listByProjectIds([query.projectId], {
      stageId: query.stageId,
      status: query.status,
      priority: query.priority,
      type: query.type,
      assigneeId: query.assigneeId,
      overdue: query.overdue,
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize
    });
  }

  listByProjectIds(projectIds: string[], query: RdListFilters): RdItemListResult {
    if (projectIds.length === 0) {
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0
      };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    const placeholders = projectIds.map(() => "?").join(", " );
    conditions.push(`i.project_id IN (${placeholders})`);
    params.push(...projectIds);
    this.appendListFilters(conditions, params, query);

    const whereSql = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db.prepare(`
      SELECT COUNT(1) AS total
      FROM rd_items i
      ${whereSql}
    `).get(...params) as { total: number };

    const offset = (query.page - 1) * query.pageSize;
    const rows = this.db.prepare(`
      SELECT i.*, s.name AS stage_name
      FROM rd_items i
      LEFT JOIN rd_stages s ON s.id = i.stage_id
      ${whereSql}
      ORDER BY i.updated_at DESC, i.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, query.pageSize, offset) as RdItemRow[];

    return {
      items: rows.map((row) => this.toItemEntity(row)),
      page: query.page,
      pageSize: query.pageSize,
      total: totalRow.total
    };
  }

  private appendListFilters(conditions: string[], params: unknown[], query: RdListFilters): void {
    if (query.stageId) {
      conditions.push("i.stage_id = ?");
      params.push(query.stageId);
    }
    if (query.status) {
      conditions.push("i.status = ?");
      params.push(query.status);
    }
    if (query.priority) {
      conditions.push("i.priority = ?");
      params.push(query.priority);
    }
    if (query.type) {
      conditions.push("i.type = ?");
      params.push(query.type);
    }
    if (query.assigneeId) {
      conditions.push("i.assignee_id = ?");
      params.push(query.assigneeId);
    }
    if (query.overdue) {
      conditions.push("i.plan_end_at IS NOT NULL");
      conditions.push("i.plan_end_at <> ''");
      conditions.push("date(i.plan_end_at) < date('now')");
      conditions.push("i.status NOT IN ('done', 'canceled')");
    }
    if (query.keyword) {
      const keyword = `%${query.keyword}%`;
      conditions.push("(i.rd_no LIKE ? OR i.title LIKE ? OR i.description LIKE ?)");
      params.push(keyword, keyword, keyword);
    }
  }

  getOverview(projectId: string): RdOverview {
    const row = this.db.prepare(`
      SELECT
        COUNT(1) AS total_count,
        SUM(CASE WHEN status = 'doing' THEN 1 ELSE 0 END) AS doing_count,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked_count,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count,
        SUM(
          CASE
            WHEN plan_end_at IS NOT NULL
              AND plan_end_at <> ''
              AND date(plan_end_at) < date('now')
              AND status NOT IN ('done', 'canceled')
            THEN 1 ELSE 0
          END
        ) AS overdue_count
      FROM rd_items
      WHERE project_id = ?
    `).get(projectId) as OverviewRow;

    const totalCount = row.total_count ?? 0;
    const doneCount = row.done_count ?? 0;
    const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return {
      totalCount,
      doingCount: row.doing_count ?? 0,
      blockedCount: row.blocked_count ?? 0,
      doneCount,
      overdueCount: row.overdue_count ?? 0,
      completionRate
    };
  }

  listLogs(itemId: string): RdLogEntity[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM rd_logs
      WHERE item_id = ?
      ORDER BY created_at DESC
    `).all(itemId) as RdLogRow[];

    return rows.map((row) => this.toLogEntity(row));
  }

  createLog(entity: RdLogEntity): void {
    this.db.prepare(`
      INSERT INTO rd_logs (id, project_id, item_id, action_type, content, operator_id, operator_name, created_at)
      VALUES (@id, @project_id, @item_id, @action_type, @content, @operator_id, @operator_name, @created_at)
    `).run({
      id: entity.id,
      project_id: entity.projectId,
      item_id: entity.itemId,
      action_type: entity.actionType,
      content: entity.content,
      operator_id: entity.operatorId ?? null,
      operator_name: entity.operatorName ?? null,
      created_at: entity.createdAt
    });
  }

  getDetail(projectId: string, itemId: string): RdItemDetailResult | null {
    const item = this.findItemById(projectId, itemId);
    if (!item) {
      return null;
    }

    return {
      item,
      logs: this.listLogs(item.id)
    };
  }

  private toDbItemEntity(entity: RdItemEntity) {
    return {
      id: entity.id,
      project_id: entity.projectId,
      rd_no: entity.rdNo,
      title: entity.title,
      description: entity.description,
      stage_id: entity.stageId,
      type: entity.type,
      status: entity.status,
      priority: entity.priority,
      assignee_id: entity.assigneeId ?? null,
      assignee_name: entity.assigneeName ?? null,
      creator_id: entity.creatorId,
      creator_name: entity.creatorName,
      reviewer_id: entity.reviewerId ?? null,
      reviewer_name: entity.reviewerName ?? null,
      progress: entity.progress,
      plan_start_at: entity.planStartAt ?? null,
      plan_end_at: entity.planEndAt ?? null,
      actual_start_at: entity.actualStartAt ?? null,
      actual_end_at: entity.actualEndAt ?? null,
      blocker_reason: entity.blockerReason ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    };
  }

  private toStageEntity(row: RdStageRow): RdStageEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      sort: row.sort,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toItemEntity(row: RdItemRow): RdItemEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      rdNo: row.rd_no,
      title: row.title,
      description: row.description,
      stageId: row.stage_id,
      stageName: row.stage_name ?? null,
      type: row.type as RdItemEntity["type"],
      status: row.status as RdItemEntity["status"],
      priority: row.priority as RdItemEntity["priority"],
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name,
      progress: row.progress,
      planStartAt: row.plan_start_at,
      planEndAt: row.plan_end_at,
      actualStartAt: row.actual_start_at,
      actualEndAt: row.actual_end_at,
      blockerReason: row.blocker_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toLogEntity(row: RdLogRow): RdLogEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      itemId: row.item_id,
      actionType: row.action_type as RdLogEntity["actionType"],
      content: row.content,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      createdAt: row.created_at
    };
  }
}
