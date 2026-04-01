import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  IssueEntity,
  IssueDashboardActivity,
  IssueDashboardTodo,
  IssueListResult,
  IssueLogEntity,
  ListIssuesQuery
} from "./issue.types";

type IssueRow = {
  id: string;
  project_id: string;
  issue_no: string;
  title: string;
  description: string | null;
  type: "bug" | "feature" | "change" | "improvement" | "task" | "test" | "support";
  status: "open" | "in_progress" | "resolved" | "verified" | "closed" | "reopened";
  priority: "low" | "medium" | "high" | "critical";
  reporter_id: string;
  reporter_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  participant_count?: number | null;
  participant_names?: string | null;
  verifier_id: string | null;
  verifier_name: string | null;
  module_code: string | null;
  version_code: string | null;
  environment_code: string | null;
  resolution_summary: string | null;
  close_reason: string | null;
  close_remark: string | null;
  reopen_count: number;
  started_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type IssueLogRow = {
  id: string;
  issue_id: string;
  action_type: "create" | "update" | "comment" | "assign" | "start" | "resolve" | "verify" | "reopen" | "close";
  from_status: "open" | "in_progress" | "resolved" | "verified" | "closed" | "reopened" | null;
  to_status: "open" | "in_progress" | "resolved" | "verified" | "closed" | "reopened" | null;
  operator_id: string | null;
  operator_name: string | null;
  summary: string | null;
  meta_json: string | null;
  created_at: string;
};

type UpdateIssueRowInput = Partial<{
  title: string;
  description: string | null;
  type: "bug" | "feature" | "change" | "improvement" | "task" | "test";
  status: "open" | "in_progress" | "resolved" | "verified" | "closed" | "reopened";
  priority: "low" | "medium" | "high" | "critical";
  assignee_id: string | null;
  assignee_name: string | null;
  verifier_id: string | null;
  verifier_name: string | null;
  module_code: string | null;
  version_code: string | null;
  environment_code: string | null;
  resolution_summary: string | null;
  close_reason: string | null;
  close_remark: string | null;
  reopen_count: number;
  started_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  updated_at: string;
}>;

const ISSUE_NO_PREFIX_BY_TYPE: Record<IssueEntity["type"], string> = {
  bug: "BUG",
  feature: "FEAT",
  change: "CHG",
  improvement: "IMP",
  task: "TASK",
  test: "TEST"
};

export class IssueRepo {
  private readonly displayNameCache = new Map<string, string | null>();

  constructor(private readonly db: Database.Database) {}

  create(entity: IssueEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO issues (
            id, project_id, issue_no, title, description, type, status, priority,
            reporter_id, reporter_name, assignee_id, assignee_name, verifier_id, verifier_name,
            module_code, version_code, environment_code, resolution_summary, close_reason, close_remark,
            reopen_count, started_at, resolved_at, verified_at, closed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.issueNo,
        entity.title,
        entity.description,
        entity.type,
        entity.status,
        entity.priority,
        entity.reporterId,
        entity.reporterName,
        entity.assigneeId,
        entity.assigneeName,
        entity.verifierId,
        entity.verifierName,
        entity.moduleCode,
        entity.versionCode,
        entity.environmentCode,
        entity.resolutionSummary,
        entity.closeReason,
        entity.closeRemark,
        entity.reopenCount,
        entity.startedAt,
        entity.resolvedAt,
        entity.verifiedAt,
        entity.closedAt,
        entity.createdAt,
        entity.updatedAt
      );
  }

  findById(id: string): IssueEntity | null {
    const row = this.db.prepare("SELECT * FROM issues WHERE id = ?").get(id) as IssueRow | undefined;
    return row ? this.mapIssue(row) : null;
  }

  list(query: ListIssuesQuery, projectIds?: string[]): IssueListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (projectIds) {
      if (projectIds.length === 0) {
        return { items: [], page, pageSize, total: 0 };
      }
      conditions.push(`i.project_id IN (${projectIds.map(() => "?").join(", ")})`);
      params.push(...projectIds);
    }

    if (query.projectId?.trim()) {
      conditions.push("i.project_id = ?");
      params.push(query.projectId.trim());
    }

    if (query.status && query.status.length > 0) {
      conditions.push(`i.status IN (${query.status.map(() => "?").join(", ")})`);
      params.push(...query.status);
    }

    if (query.type) {
      if (query.type === "task") {
        conditions.push("(i.type = ? OR i.type = 'support')");
        params.push(query.type);
      } else {
        conditions.push("i.type = ?");
        params.push(query.type);
      }
    }

    if (query.priority && query.priority.length > 0) {
      conditions.push(`i.priority IN (${query.priority.map(() => "?").join(", ")})`);
      params.push(...query.priority);
    }

    if (query.reporterIds && query.reporterIds.length > 0) {
      conditions.push(`i.reporter_id IN (${query.reporterIds.map(() => "?").join(", ")})`);
      params.push(...query.reporterIds);
    }

    if (query.assigneeIds && query.assigneeIds.length > 0) {
      const includesUnassigned = query.assigneeIds.includes("__unassigned__");
      const assigneeIds = query.assigneeIds.filter((id) => id !== "__unassigned__");
      const includeParticipants = query.includeAssigneeParticipants !== false;

      const groupConditions: string[] = [];
      if (assigneeIds.length > 0) {
        const assigneePlaceholders = assigneeIds.map(() => "?").join(", ");
        if (includeParticipants) {
          groupConditions.push(
            `(i.assignee_id IN (${assigneePlaceholders}) OR EXISTS (
              SELECT 1
              FROM issue_participants ip
              WHERE ip.issue_id = i.id
                AND ip.user_id IN (${assigneePlaceholders})
            ))`
          );
          params.push(...assigneeIds, ...assigneeIds);
        } else {
          groupConditions.push(`i.assignee_id IN (${assigneePlaceholders})`);
          params.push(...assigneeIds);
        }
      }

      if (includesUnassigned) {
        groupConditions.push("i.assignee_id IS NULL");
      }

      if (groupConditions.length > 0) {
        conditions.push(`(${groupConditions.join(" OR ")})`);
      }
    }

    if (query.moduleCodes && query.moduleCodes.length > 0) {
      conditions.push(`COALESCE(i.module_code, '') IN (${query.moduleCodes.map(() => "?").join(", ")})`);
      params.push(...query.moduleCodes);
    }

    if (query.versionCodes && query.versionCodes.length > 0) {
      conditions.push(`COALESCE(i.version_code, '') IN (${query.versionCodes.map(() => "?").join(", ")})`);
      params.push(...query.versionCodes);
    }

    if (query.environmentCodes && query.environmentCodes.length > 0) {
      conditions.push(`COALESCE(i.environment_code, '') IN (${query.environmentCodes.map(() => "?").join(", ")})`);
      params.push(...query.environmentCodes);
    }

    if (query.assigneeId?.trim()) {
      conditions.push("i.assignee_id = ?");
      params.push(query.assigneeId.trim());
    }

    if (query.verifierId?.trim()) {
      conditions.push("i.verifier_id = ?");
      params.push(query.verifierId.trim());
    }

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push("(i.title LIKE ? OR i.issue_no LIKE ? OR i.description LIKE ?)");
      params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortColumn = query.sortBy === "createdAt" ? "i.created_at" : "i.updated_at";
    const sortDirection = query.sortOrder === "asc" ? "ASC" : "DESC";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM issues i ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT i.*, COALESCE(pc.participant_count, 0) AS participant_count
               , COALESCE(pc.participant_names, '') AS participant_names
          FROM issues i
          LEFT JOIN (
            SELECT issue_id, COUNT(*) AS participant_count, GROUP_CONCAT(user_name, '||') AS participant_names
            FROM issue_participants
            GROUP BY issue_id
          ) pc ON pc.issue_id = i.id
          ${whereClause}
          ORDER BY ${sortColumn} ${sortDirection}
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as IssueRow[];

    return {
      items: rows.map((row) => this.mapIssue(row)),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  update(id: string, input: UpdateIssueRowInput): boolean {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      return false;
    }

    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    const params = entries.map(([, value]) => value);
    const result = this.db.prepare(`UPDATE issues SET ${assignments} WHERE id = ?`).run(...params, id);
    return result.changes > 0;
  }

  getNextIssueNo(projectId: string, type: IssueEntity["type"]): string {
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
    const typeCode = ISSUE_NO_PREFIX_BY_TYPE[type] ?? "ISS";
    const row = this.db.prepare("SELECT COUNT(*) as total FROM issues WHERE project_id = ?").get(projectId) as { total: number };
    let seq = row.total + 1;
    while (seq <= 999999) {
      const candidate = `${projectCode}-${typeCode}-${String(seq).padStart(4, "0")}`;
      const exists = this.db.prepare("SELECT 1 as hit FROM issues WHERE issue_no = ? LIMIT 1").get(candidate) as
        | { hit: number }
        | undefined;
      if (!exists) {
        return candidate;
      }
      seq += 1;
    }
    throw new Error("ISSUE_NO_GENERATE_FAILED");
  }

  createLog(log: IssueLogEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO issue_logs (
            id, issue_id, action_type, from_status, to_status, operator_id, operator_name, summary, meta_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        log.id,
        log.issueId,
        log.actionType,
        log.fromStatus,
        log.toStatus,
        log.operatorId,
        log.operatorName,
        log.summary,
        log.metaJson,
        log.createdAt
      );
  }

  listLogs(issueId: string): IssueLogEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM issue_logs
          WHERE issue_id = ?
          ORDER BY created_at DESC
        `
      )
      .all(issueId) as IssueLogRow[];

    return rows.map((row) => this.mapLog(row));
  }

  countAssignedForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM issues
          WHERE assignee_id = ?
            AND status IN ('open', 'in_progress', 'reopened')
            ${scope.clause}
        `
      )
      .get(userId, ...scope.params) as { total: number };
    return row.total;
  }

  countVerifyingForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM issues
          WHERE COALESCE(verifier_id, reporter_id) = ?
            AND status = 'resolved'
            ${scope.clause}
        `
      )
      .get(userId, ...scope.params) as { total: number };
    return row.total;
  }

  countReportedUnresolvedForDashboard(projectIds: string[], userId: string): number {
    const scope = this.createProjectScope(projectIds);
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM issues
          WHERE reporter_id = ?
            AND status IN ('open', 'in_progress', 'reopened')
            ${scope.clause}
        `
      )
      .get(userId, ...scope.params) as { total: number };
    return row.total;
  }

  listTodosForDashboard(projectIds: string[], userId: string, limit: number): IssueDashboardTodo[] {
    const scope = this.createProjectScope(projectIds);
    const assigned = this.db
      .prepare(
        `
          SELECT id, issue_no as code, title, status, updated_at, project_id
          FROM issues
          WHERE assignee_id = ?
            AND status IN ('open', 'in_progress', 'reopened')
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

    const verifying = this.db
      .prepare(
        `
          SELECT id, issue_no as code, title, status, updated_at, project_id
          FROM issues
          WHERE COALESCE(verifier_id, reporter_id) = ?
            AND status = 'resolved'
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

    return [
      ...assigned.map((row) => this.mapDashboardTodo("issue_assigned", row)),
      ...verifying.map((row) => this.mapDashboardTodo("issue_verify", row))
    ]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  listActivitiesForDashboard(projectIds: string[], userId: string, limit: number): IssueDashboardActivity[] {
    const scope = this.createProjectScope(projectIds);
    const rows = this.db
      .prepare(
        `
          SELECT
            l.issue_id as entity_id,
            i.issue_no as code,
            i.title as title,
            l.action_type as action_type,
            l.summary as summary,
            l.created_at as created_at,
            i.project_id as project_id
          FROM issue_logs l
          INNER JOIN issues i ON i.id = l.issue_id
          WHERE l.operator_id = ?
            ${scope.clause.replace(/project_id/g, "i.project_id")}
          ORDER BY l.created_at DESC
          LIMIT ?
        `
      )
      .all(userId, ...scope.params, limit) as Array<{
      entity_id: string;
      code: string;
      title: string;
      action_type: string;
      summary: string | null;
      created_at: string;
      project_id: string;
    }>;

    return rows.map((row) => ({
      kind: "issue_activity",
      entityId: row.entity_id,
      code: row.code,
      title: row.title,
      action: row.action_type,
      summary: row.summary,
      createdAt: row.created_at,
      projectId: row.project_id,
    }));
  }

  private mapIssue(row: IssueRow): IssueEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      issueNo: row.issue_no,
      title: row.title,
      description: row.description,
      type: this.normalizeIssueType(row.type),
      status: row.status,
      priority: row.priority,
      reporterId: row.reporter_id,
      reporterName: this.normalizeActorName(row.reporter_id, row.reporter_name) ?? row.reporter_name,
      assigneeId: row.assignee_id,
      assigneeName: this.normalizeActorName(row.assignee_id, row.assignee_name),
      participantCount: Number(row.participant_count ?? 0),
      participantNames: this.normalizeParticipantNames(row.participant_names),
      verifierId: row.verifier_id,
      verifierName: this.normalizeActorName(row.verifier_id, row.verifier_name),
      moduleCode: row.module_code,
      versionCode: row.version_code,
      environmentCode: row.environment_code,
      resolutionSummary: row.resolution_summary,
      closeReason: row.close_reason,
      closeRemark: row.close_remark,
      reopenCount: row.reopen_count,
      startedAt: row.started_at,
      resolvedAt: row.resolved_at,
      verifiedAt: row.verified_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapLog(row: IssueLogRow): IssueLogEntity {
    return {
      id: row.id,
      issueId: row.issue_id,
      actionType: row.action_type,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      operatorId: row.operator_id,
      operatorName: this.normalizeActorName(row.operator_id, row.operator_name),
      summary: row.summary,
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
    kind: IssueDashboardTodo["kind"],
    row: { id: string; code: string; title: string; status: string; updated_at: string; project_id: string }
  ): IssueDashboardTodo {
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

  private normalizeIssueType(type: IssueRow["type"]): IssueEntity["type"] {
    if (type === "support") {
      return "task";
    }
    return type;
  }

  private normalizeActorName(actorId: string | null, actorName: string | null): string | null {
    const current = actorName?.trim() || null;
    const id = actorId?.trim() || null;
    if (!current) {
      return id ? this.lookupDisplayNameById(id) : null;
    }

    // Handle historical rows where *_name was saved as usr_xxx/adm_xxx.
    if (id && current === id) {
      return this.lookupDisplayNameById(id) ?? current;
    }

    if (this.looksLikeActorId(current)) {
      return this.lookupDisplayNameById(current) ?? current;
    }

    return current;
  }

  private looksLikeActorId(value: string): boolean {
    return /^usr_[a-z0-9]+$/i.test(value) || /^adm_[a-z0-9]+$/i.test(value);
  }

  private lookupDisplayNameById(id: string): string | null {
    if (this.displayNameCache.has(id)) {
      return this.displayNameCache.get(id) ?? null;
    }

    const userRow = this.db
      .prepare(
        `
          SELECT COALESCE(NULLIF(display_name, ''), username) AS name
          FROM users
          WHERE id = ?
          LIMIT 1
        `
      )
      .get(id) as { name: string | null } | undefined;

    if (userRow?.name?.trim()) {
      const normalized = userRow.name.trim();
      this.displayNameCache.set(id, normalized);
      return normalized;
    }

    const adminRow = this.db
      .prepare(
        `
          SELECT COALESCE(NULLIF(nickname, ''), username) AS name
          FROM admin_accounts
          WHERE id = ? OR user_id = ?
          LIMIT 1
        `
      )
      .get(id, id) as { name: string | null } | undefined;

    const resolved = adminRow?.name?.trim() || null;
    this.displayNameCache.set(id, resolved);
    return resolved;
  }

  private normalizeParticipantNames(raw: string | null | undefined): string[] {
    const source = raw?.trim();
    if (!source) {
      return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    for (const name of source.split("||").map((item) => item.trim()).filter(Boolean)) {
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);
      result.push(name);
    }
    return result;
  }
}
