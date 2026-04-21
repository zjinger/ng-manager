import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListRdItemsQuery,
  RdDashboardActivity,
  RdDashboardTodo,
  RdItemEntity,
  RdItemListResult,
  RdLogEntity,
  RdStageHistoryEntry,
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
  type:
    | "feature_dev"
    | "tech_refactor"
    | "integration"
    | "env_setup"
    | "requirement_confirmation"
    | "solution_design"
    | "testing_validation"
    | "delivery_launch"
    | "project_closure";
  status: "todo" | "doing" | "blocked" | "done" | "accepted" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  assignee_id: string | null;
  assignee_name: string | null;
  creator_id: string;
  creator_name: string;
  verifier_id: string | null;
  verifier_name: string | null;
  member_ids: string | null;
  progress: number;
  plan_start_at: string | null;
  plan_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  blocker_reason: string | null;
  created_at: string;
  updated_at: string;
};

type RdProgressRow = {
  id: string;
  item_id: string;
  user_id: string;
  progress: number;
  note: string | null;
  updated_at: string;
};

type RdProgressHistoryRow = {
  id: string;
  item_id: string;
  user_id: string;
  old_progress: number | null;
  new_progress: number;
  note: string | null;
  created_at: string;
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
    | "reopen"
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
  type:
    | "feature_dev"
    | "tech_refactor"
    | "integration"
    | "env_setup"
    | "requirement_confirmation"
    | "solution_design"
    | "testing_validation"
    | "delivery_launch"
    | "project_closure";
  status: "todo" | "doing" | "blocked" | "done" | "accepted" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  assignee_id: string | null;
  assignee_name: string | null;
verifier_id: string | null;
  verifier_name: string | null;
  member_ids: string | null;
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
  env_setup: "ENV",
  requirement_confirmation: "REQ",
  solution_design: "DES",
  testing_validation: "TST",
  delivery_launch: "DLV",
  project_closure: "CLS"
};

type RdStageHistoryRow = {
  id: string;
  project_id: string;
  item_id: string;
  from_stage_id: string | null;
  from_stage_name: string;
  to_stage_id: string;
  to_stage_name: string;
  snapshot_json: string;
  operator_id: string | null;
  operator_name: string | null;
  created_at: string;
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
            assignee_id, assignee_name, creator_id, creator_name, verifier_id, verifier_name, member_ids,
            progress, plan_start_at, plan_end_at, actual_start_at, actual_end_at, blocker_reason,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        entity.verifierId,
        entity.verifierName,
        JSON.stringify(entity.memberIds ?? []),
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
    const stageTrailByItemId = this.listStageTrailByItemIds(rows.map((row) => row.id));

    return {
      items: rows.map((row) => this.mapItem(row, stageTrailByItemId.get(row.id) ?? [])),
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
          WHERE (assignee_id = ? OR instr(COALESCE(member_ids, ''), '"' || ? || '"') > 0)
            AND status IN ('todo', 'doing', 'blocked')
            ${scope.clause}
        `
      )
      .get(userId, userId, ...scope.params) as { total: number };
    return row.total;
  }

  createStageHistory(entity: RdStageHistoryEntry): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_stage_history (
            id, project_id, item_id, from_stage_id, from_stage_name, to_stage_id, to_stage_name,
            snapshot_json, operator_id, operator_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.itemId,
        entity.fromStageId,
        entity.fromStageName,
        entity.toStageId,
        entity.toStageName,
        entity.snapshotJson,
        entity.operatorId,
        entity.operatorName,
        entity.createdAt
      );
  }

  listStageHistoryByItemId(itemId: string): RdStageHistoryEntry[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM rd_stage_history
          WHERE item_id = ?
          ORDER BY created_at DESC
        `
      )
      .all(itemId) as RdStageHistoryRow[];
    return rows.map((row) => this.mapStageHistory(row));
  }

  countInProgressForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM rd_items
          WHERE (assignee_id = ? OR instr(COALESCE(member_ids, ''), '"' || ? || '"') > 0)
            AND status = 'doing'
            ${scope.clause}
        `
      )
      .get(userId, userId, ...scope.params) as { total: number };
    return row.total;
  }

  countReviewingForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM rd_items
          WHERE verifier_id = ?
            AND status = 'done'
            ${scope.clause}
        `
      )
      .get(userId, ...scope.params) as { total: number };
    return row.total;
  }

  listTodosForDashboard(projectIds: string[], userId: string, limit: number): RdDashboardTodo[] {
    const scope = this.createProjectScope(projectIds);
    const withLimit = Number.isFinite(limit) && limit > 0;
    const limitClause = withLimit ? "LIMIT ?" : "";
    const assigned = this.db
      .prepare(
        `
          SELECT id, rd_no as code, title, status, updated_at, project_id
          FROM rd_items
          WHERE (assignee_id = ? OR instr(COALESCE(member_ids, ''), '"' || ? || '"') > 0)
            AND status IN ('todo', 'doing', 'blocked')
            ${scope.clause}
          ORDER BY updated_at DESC
          ${limitClause}
        `
      )
      .all(userId, userId, ...scope.params, ...(withLimit ? [limit] : [])) as Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      updated_at: string;
      project_id: string;
    }>;
    const reviewing = this.db
      .prepare(
        `
          SELECT id, rd_no as code, title, status, updated_at, project_id
          FROM rd_items
          WHERE verifier_id = ?
            AND status = 'done'
            ${scope.clause}
          ORDER BY updated_at DESC
          ${limitClause}
        `
      )
      .all(userId, ...scope.params, ...(withLimit ? [limit] : [])) as Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      updated_at: string;
      project_id: string;
    }>;

    const merged = [
      ...assigned.map((row) => this.mapDashboardTodo("rd_assigned", row)),
      ...reviewing.map((row) => this.mapDashboardTodo("rd_verify", row)),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const dedup = new Map<string, RdDashboardTodo>();
    for (const item of merged) {
      const existing = dedup.get(item.entityId);
      if (!existing) {
        dedup.set(item.entityId, item);
        continue;
      }
      // 同一研发项同时命中“执行待办”和“验证待办”时，优先保留验证待办。
      if (existing.kind === "rd_assigned" && item.kind === "rd_verify") {
        dedup.set(item.entityId, item);
      }
    }

    return Array.from(dedup.values())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, withLimit ? limit : undefined);
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

  private mapItem(row: RdItemRow, stageTrail: string[] = []): RdItemEntity {
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
      verifierId: row.verifier_id,
      verifierName: row.verifier_name,
      memberIds: row.member_ids ? JSON.parse(row.member_ids) : [],
      progress: row.progress,
      planStartAt: row.plan_start_at,
      planEndAt: row.plan_end_at,
      actualStartAt: row.actual_start_at,
      actualEndAt: row.actual_end_at,
      blockerReason: row.blocker_reason,
      stageTrail,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private listStageTrailByItemIds(itemIds: string[]): Map<string, string[]> {
    const dedupIds = Array.from(new Set(itemIds.map((id) => id.trim()).filter(Boolean)));
    const map = new Map<string, string[]>();
    if (dedupIds.length === 0) {
      return map;
    }

    const rows = this.db
      .prepare(
        `
          SELECT item_id, from_stage_name, to_stage_name
          FROM rd_stage_history
          WHERE item_id IN (${dedupIds.map(() => "?").join(", ")})
          ORDER BY created_at ASC
        `
      )
      .all(...dedupIds) as Array<{
      item_id: string;
      from_stage_name: string;
      to_stage_name: string;
    }>;

    for (const row of rows) {
      const trail = map.get(row.item_id) ?? [];
      if (row.from_stage_name?.trim() && trail.length === 0) {
        trail.push(row.from_stage_name.trim());
      }
      if (row.to_stage_name?.trim()) {
        const toName = row.to_stage_name.trim();
        if (trail.length === 0 || trail[trail.length - 1] !== toName) {
          trail.push(toName);
        }
      }
      map.set(row.item_id, trail);
    }

    return map;
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

  private mapStageHistory(row: RdStageHistoryRow): RdStageHistoryEntry {
    return {
      id: row.id,
      projectId: row.project_id,
      itemId: row.item_id,
      fromStageId: row.from_stage_id,
      fromStageName: row.from_stage_name,
      toStageId: row.to_stage_id,
      toStageName: row.to_stage_name,
      snapshotJson: row.snapshot_json,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      createdAt: row.created_at,
    };
  }

  upsertProgress(progress: RdProgressRow): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_item_progress (id, item_id, user_id, progress, note, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(item_id, user_id) DO UPDATE SET
            progress = excluded.progress,
            note = excluded.note,
            updated_at = excluded.updated_at
        `
      )
      .run(progress.id, progress.item_id, progress.user_id, progress.progress, progress.note, progress.updated_at);
  }

  createProgressHistory(history: RdProgressHistoryRow): void {
    this.db
      .prepare(
        "INSERT INTO rd_progress_history (id, item_id, user_id, old_progress, new_progress, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(history.id, history.item_id, history.user_id, history.old_progress, history.new_progress, history.note, history.created_at);
  }

  deleteProgressByItemId(itemId: string): void {
    this.db.prepare("DELETE FROM rd_item_progress WHERE item_id = ?").run(itemId);
  }

  listProgressByItemId(itemId: string): RdProgressRow[] {
    return this.db
      .prepare("SELECT * FROM rd_item_progress WHERE item_id = ? ORDER BY updated_at DESC")
      .all(itemId) as RdProgressRow[];
  }

  listProgressHistoryByItemId(itemId: string, limit: number = 20): RdProgressHistoryRow[] {
    return this.db
      .prepare("SELECT * FROM rd_progress_history WHERE item_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(itemId, limit) as RdProgressHistoryRow[];
  }

  getProgressByItemAndUser(itemId: string, userId: string): RdProgressRow | null {
    return (
      (this.db
        .prepare("SELECT * FROM rd_item_progress WHERE item_id = ? AND user_id = ?")
        .get(itemId, userId) as RdProgressRow | undefined) ?? null
    );
  }

  calculateMainProgress(itemId: string): number {
    const progresses = this.listProgressByItemId(itemId);
    if (progresses.length === 0) return 0;
    const sum = progresses.reduce((acc, p) => acc + p.progress, 0);
    return Math.round(sum / progresses.length);
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
