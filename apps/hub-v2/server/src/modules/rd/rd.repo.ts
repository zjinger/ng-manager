import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListRdItemsQuery,
  RdDashboardActivity,
  RdDashboardTodo,
  RdItemEntity,
  RdItemListResult,
  RdLogEntity,
  RdStageEntity
} from "./rd.types";

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
  version: number;
  title: string;
  description: string | null;
  stage_id: string | null;
  type: "feature_dev" | "tech_refactor" | "integration" | "env_setup";
  status: "todo" | "doing" | "blocked" | "done" | "accepted" | "closed";
  priority: "low" | "medium" | "high" | "critical";
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
  action_type:
    | "create"
    | "update"
    | "start"
    | "block"
    | "resume"
    | "complete"
    | "accept"
    | "close"
    | "advance_stage"
    | "delete";
  content: string | null;
  operator_id: string | null;
  operator_name: string | null;
  meta_json: string | null;
  created_at: string;
};

type UpdateRdStageRowInput = Partial<{
  name: string;
  sort: number;
  enabled: number;
  updated_at: string;
}>;

type UpdateRdItemRowInput = Partial<{
  title: string;
  description: string | null;
  stage_id: string | null;
  type: "feature_dev" | "tech_refactor" | "integration" | "env_setup";
  status: "todo" | "doing" | "blocked" | "done" | "accepted" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  assignee_id: string | null;
  assignee_name: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  progress: number;
  plan_start_at: string | null;
  plan_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  blocker_reason: string | null;
  updated_at: string;
}>;

const RD_NO_PREFIX_BY_TYPE: Record<RdItemEntity["type"], string> = {
  feature_dev: "FEAT",
  tech_refactor: "REF",
  integration: "INT",
  env_setup: "ENV"
};

export class RdRepo {
  constructor(private readonly db: Database.Database) {}

  createStage(entity: RdStageEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_stages (id, project_id, name, sort, enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(entity.id, entity.projectId, entity.name, entity.sort, entity.enabled ? 1 : 0, entity.createdAt, entity.updatedAt);
  }

  findStageById(id: string): RdStageEntity | null {
    const row = this.db.prepare("SELECT * FROM rd_stages WHERE id = ?").get(id) as RdStageRow | undefined;
    return row ? this.mapStage(row) : null;
  }

  findStageByProjectAndName(projectId: string, name: string): RdStageEntity | null {
    const row = this.db
      .prepare("SELECT * FROM rd_stages WHERE project_id = ? AND name = ?")
      .get(projectId, name) as RdStageRow | undefined;
    return row ? this.mapStage(row) : null;
  }

  listStages(projectId: string): RdStageEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM rd_stages
          WHERE project_id = ?
          ORDER BY sort ASC, created_at ASC
        `
      )
      .all(projectId) as RdStageRow[];
    return rows.map((row) => this.mapStage(row));
  }

  updateStage(id: string, input: UpdateRdStageRowInput): boolean {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      return false;
    }
    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    const params = entries.map(([, value]) => value);
    const result = this.db.prepare(`UPDATE rd_stages SET ${assignments} WHERE id = ?`).run(...params, id);
    return result.changes > 0;
  }

  createItem(entity: RdItemEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_items (
            id, project_id, rd_no, version, title, description, stage_id, type, status, priority,
            assignee_id, assignee_name, creator_id, creator_name, reviewer_id, reviewer_name,
            progress, plan_start_at, plan_end_at, actual_start_at, actual_end_at, blocker_reason,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.rdNo,
        entity.version,
        entity.title,
        entity.description,
        entity.stageId,
        entity.type,
        entity.status,
        entity.priority,
        entity.assigneeId,
        entity.assigneeName,
        entity.creatorId,
        entity.creatorName,
        entity.reviewerId,
        entity.reviewerName,
        entity.progress,
        entity.planStartAt,
        entity.planEndAt,
        entity.actualStartAt,
        entity.actualEndAt,
        entity.blockerReason,
        entity.createdAt,
        entity.updatedAt
      );
  }

  findItemById(id: string): RdItemEntity | null {
    const row = this.db.prepare("SELECT * FROM rd_items WHERE id = ?").get(id) as RdItemRow | undefined;
    return row ? this.mapItem(row) : null;
  }

  listItems(query: ListRdItemsQuery, projectIds?: string[]): RdItemListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (projectIds) {
      if (projectIds.length === 0) {
        return { items: [], page, pageSize, total: 0 };
      }
      conditions.push(`project_id IN (${projectIds.map(() => "?").join(", ")})`);
      params.push(...projectIds);
    }

    if (query.projectId?.trim()) {
      conditions.push("project_id = ?");
      params.push(query.projectId.trim());
    }
    if (query.stageId?.trim()) {
      conditions.push("stage_id = ?");
      params.push(query.stageId.trim());
    }
    if (query.stageIds && query.stageIds.length > 0) {
      conditions.push(`stage_id IN (${query.stageIds.map(() => "?").join(", ")})`);
      params.push(...query.stageIds);
    }
    if (query.status && query.status.length > 0) {
      conditions.push(`status IN (${query.status.map(() => "?").join(", ")})`);
      params.push(...query.status);
    }
    if (query.type && query.type.length > 0) {
      conditions.push(`type IN (${query.type.map(() => "?").join(", ")})`);
      params.push(...query.type);
    }
    if (query.priority && query.priority.length > 0) {
      conditions.push(`priority IN (${query.priority.map(() => "?").join(", ")})`);
      params.push(...query.priority);
    }
    if (query.assigneeIds && query.assigneeIds.length > 0) {
      conditions.push(`assignee_id IN (${query.assigneeIds.map(() => "?").join(", ")})`);
      params.push(...query.assigneeIds);
    }
    if (query.assigneeId?.trim()) {
      conditions.push("assignee_id = ?");
      params.push(query.assigneeId.trim());
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push("(title LIKE ? OR rd_no LIKE ? OR description LIKE ?)");
      params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM rd_items ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM rd_items
          ${whereClause}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as RdItemRow[];

    return {
      items: rows.map((row) => this.mapItem(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  updateItem(id: string, input: UpdateRdItemRowInput, expectedVersion?: number): boolean {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      return false;
    }
    const assignments = [...entries.map(([key]) => `${key} = ?`), "version = version + 1"].join(", ");
    const params = entries.map(([, value]) => value);
    const whereClause = expectedVersion === undefined ? "id = ?" : "id = ? AND version = ?";
    const result = this.db
      .prepare(`UPDATE rd_items SET ${assignments} WHERE ${whereClause}`)
      .run(...params, id, ...(expectedVersion === undefined ? [] : [expectedVersion]));
    return result.changes > 0;
  }

  deleteItem(id: string): boolean {
    const result = this.db.prepare("DELETE FROM rd_items WHERE id = ?").run(id);
    return result.changes > 0;
  }

  getNextRdNo(projectId: string, type: RdItemEntity["type"]): string {
    const projectRow = this.db
      .prepare(
        `
          SELECT COALESCE(NULLIF(display_code, ''), 'PRJ') AS display_code
          FROM projects
          WHERE id = ?
          LIMIT 1
        `
      )
      .get(projectId) as { display_code: string } | undefined;

    const projectCode = (projectRow?.display_code || "PRJ").toUpperCase().slice(0, 3).padEnd(3, "X");
    const typeCode = RD_NO_PREFIX_BY_TYPE[type] ?? "RD";
    const row = this.db.prepare("SELECT COUNT(*) as total FROM rd_items WHERE project_id = ?").get(projectId) as {
      total: number;
    };

    let seq = row.total + 1;
    while (seq <= 999999) {
      const candidate = `${projectCode}-${typeCode}-${String(seq).padStart(4, "0")}`;
      const exists = this.db.prepare("SELECT 1 as hit FROM rd_items WHERE rd_no = ? LIMIT 1").get(candidate) as
        | { hit: number }
        | undefined;
      if (!exists) {
        return candidate;
      }
      seq += 1;
    }

    throw new Error("RD_NO_GENERATE_FAILED");
  }

  createLog(entity: RdLogEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_logs (id, project_id, item_id, action_type, content, operator_id, operator_name, meta_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.itemId,
        entity.actionType,
        entity.content,
        entity.operatorId,
        entity.operatorName,
        entity.metaJson,
        entity.createdAt
      );
  }

  listLogs(itemId: string): RdLogEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM rd_logs
          WHERE item_id = ?
          ORDER BY created_at DESC
        `
      )
      .all(itemId) as RdLogRow[];
    return rows.map((row) => this.mapLog(row));
  }

  countAssignedForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM rd_items
          WHERE assignee_id = ?
            AND status IN ('todo', 'doing', 'blocked')
            ${scope.clause}
        `
      )
      .get(userId, ...scope.params) as { total: number };
    return row.total;
  }

  countInProgressForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM rd_items
          WHERE assignee_id = ?
            AND status = 'doing'
            ${scope.clause}
        `
      )
      .get(userId, ...scope.params) as { total: number };
    return row.total;
  }

  countReviewingForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM rd_items
          WHERE reviewer_id = ?
            AND status = 'done'
            ${scope.clause}
        `
      )
      .get(userId, ...scope.params) as { total: number };
    return row.total;
  }

  listTodosForDashboard(projectIds: string[], userId: string, limit: number): RdDashboardTodo[] {
    const scope = this.createProjectScope(projectIds);
    const assigned = this.db
      .prepare(
        `
          SELECT id, rd_no as code, title, status, updated_at, project_id
          FROM rd_items
          WHERE assignee_id = ?
            AND status IN ('todo', 'doing', 'blocked')
            ${scope.clause}
          ORDER BY updated_at DESC
          LIMIT ?
        `
      )
      .all(userId, ...scope.params, limit) as Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      updated_at: string;
      project_id: string;
    }>;

    return assigned
      .map((row) => this.mapDashboardTodo("rd_assigned", row))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  listActivitiesForDashboard(projectIds: string[], userId: string, limit: number): RdDashboardActivity[] {
    const scope = this.createProjectScope(projectIds);
    const rows = this.db
      .prepare(
        `
          SELECT
            l.item_id as entity_id,
            r.rd_no as code,
            r.title as title,
            l.action_type as action_type,
            l.content as content,
            l.created_at as created_at,
            r.project_id as project_id
          FROM rd_logs l
          INNER JOIN rd_items r ON r.id = l.item_id
          WHERE l.operator_id = ?
            ${scope.clause.replace(/project_id/g, "r.project_id")}
          ORDER BY l.created_at DESC
          LIMIT ?
        `
      )
      .all(userId, ...scope.params, limit) as Array<{
      entity_id: string;
      code: string;
      title: string;
      action_type: string;
      content: string | null;
      created_at: string;
      project_id: string;
    }>;

    return rows.map((row) => ({
      kind: "rd_activity",
      entityId: row.entity_id,
      code: row.code,
      title: row.title,
      action: row.action_type,
      summary: row.content,
      createdAt: row.created_at,
      projectId: row.project_id,
    }));
  }

  private mapStage(row: RdStageRow): RdStageEntity {
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

  private mapItem(row: RdItemRow): RdItemEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      rdNo: row.rd_no,
      version: row.version,
      title: row.title,
      description: row.description,
      stageId: row.stage_id,
      type: row.type,
      status: row.status,
      priority: row.priority,
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

  private mapLog(row: RdLogRow): RdLogEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      itemId: row.item_id,
      actionType: row.action_type,
      content: row.content,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      metaJson: row.meta_json,
      createdAt: row.created_at
    };
  }

  private createProjectScope(projectIds: string[]) {
    if (projectIds.length === 0) {
      return { clause: "", params: [] as string[] };
    }

    return {
      clause: `AND project_id IN (${projectIds.map(() => "?").join(", ")})`,
      params: projectIds
    };
  }

  private mapDashboardTodo(
    kind: RdDashboardTodo["kind"],
    row: { id: string; code: string; title: string; status: string; updated_at: string; project_id: string }
  ): RdDashboardTodo {
    return {
      kind,
      entityId: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
      projectId: row.project_id
    };
  }
}
