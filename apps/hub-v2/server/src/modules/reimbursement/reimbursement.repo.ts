import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  AttachReimbursementUploadInput,
  ListReimbursementClaimsQuery,
  ReimbursementApprovalTaskEntity,
  ReimbursementAttachmentEntity,
  ReimbursementClaimDetail,
  ReimbursementClaimEntity,
  ReimbursementClaimListResult,
  ReimbursementClaimStatus,
  ReimbursementClaimType,
  ReimbursementDashboard,
  ReimbursementItemEntity,
  ReimbursementLogAction,
  ReimbursementLogEntity,
  ReimbursementStats,
  ReimbursementStatsQuery,
  ReimbursementTaskStatus
} from "./reimbursement.types";

export interface UserApprovalProfile {
  id: string;
  username: string;
  displayName: string | null;
  managerUserId: string | null;
}

export interface DepartmentApprovalProfile {
  id: string;
  name: string;
  managerUserId: string | null;
}

export interface ApprovalTemplateStage {
  id: string;
  templateId: string;
  stageCode: string;
  stageName: string;
  stageType: string;
  resolverType: string;
  resolverRef: string | null;
  sort: number;
}

export interface ApprovalTemplateWithStages {
  id: string;
  code: string;
  name: string;
  stages: ApprovalTemplateStage[];
}

const DEFAULT_APPROVAL_TEMPLATE_ID = "tpl_expense_default";
const DEFAULT_APPROVAL_TEMPLATE_CODE = "expense_default";
const DEFAULT_APPROVAL_STAGE_SEEDS = [
  {
    id: "stg_expense_direct_manager",
    stageCode: "review",
    stageName: "审核",
    stageType: "special_authorizer",
    resolverType: "system_role",
    resolverRef: "srole_expense_manager",
    sort: 10
  },
  {
    id: "stg_expense_department_manager",
    stageCode: "department_manager",
    stageName: "部门主管",
    stageType: "department_manager",
    resolverType: "department_manager",
    resolverRef: null,
    sort: 20
  },
  {
    id: "stg_expense_finance_review",
    stageCode: "finance_review",
    stageName: "会计",
    stageType: "finance_review",
    resolverType: "system_role",
    resolverRef: "srole_finance_reviewer",
    sort: 30
  },
  {
    id: "stg_expense_cashier",
    stageCode: "cashier",
    stageName: "出纳",
    stageType: "cashier",
    resolverType: "system_role",
    resolverRef: "srole_finance_cashier",
    sort: 40
  }
] as const;

type ClaimRow = {
  id: string;
  claim_no: string;
  claim_type: ReimbursementClaimType;
  status: ReimbursementClaimStatus;
  applicant_user_id: string;
  applicant_name: string;
  department_id: string;
  department_name: string;
  reason: string;
  fill_date: string;
  travel_start_date: string | null;
  travel_start_half: "am" | "pm" | null;
  travel_end_date: string | null;
  travel_end_half: "am" | "pm" | null;
  travel_days: number | null;
  receipt_count: number | null;
  total_amount_cents: number;
  advance_amount_cents: number;
  balance_amount_cents: number;
  current_stage_code: string | null;
  current_stage_name: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  claim_id: string;
  item_type: "travel" | "general";
  category: string | null;
  description: string | null;
  occurred_date: string | null;
  start_date: string | null;
  end_date: string | null;
  from_location: string | null;
  to_location: string | null;
  amount_cents: number;
  meta_json: string | null;
  sort: number;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  claim_id: string;
  template_id: string;
  template_stage_id: string | null;
  stage_code: string;
  stage_name: string;
  stage_type: string;
  resolver_type: string;
  resolver_ref: string | null;
  assignee_user_id: string;
  assignee_name: string;
  status: ReimbursementTaskStatus;
  sort: number;
  parent_task_id: string | null;
  transferred_from_task_id: string | null;
  comment: string | null;
  acted_at: string | null;
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  id: string;
  claim_id: string;
  upload_id: string;
  category: "invoice" | "itinerary" | "payment_proof" | "other";
  file_name: string | null;
  original_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_by_user_id: string | null;
  created_at: string;
};

type LogRow = {
  id: string;
  claim_id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: ReimbursementLogAction;
  task_id: string | null;
  comment: string | null;
  created_at: string;
};

function toAmount(cents: number): number {
  return cents / 100;
}

export function toCents(amount: number | null | undefined): number {
  if (!amount || !Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

export class ReimbursementRepo {
  constructor(private readonly db: Database.Database) {}

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  nextClaimSequence(prefix: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM reimbursement_claims WHERE claim_no LIKE ?")
      .get(`${prefix}%`) as { count: number };
    return row.count + 1;
  }

  findUserProfile(userId: string): UserApprovalProfile | null {
    const row = this.db
      .prepare("SELECT id, username, display_name, manager_user_id FROM users WHERE id = ? AND status = 'active'")
      .get(userId) as {
        id: string;
        username: string;
        display_name: string | null;
        manager_user_id: string | null;
      } | undefined;
    return row
      ? {
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          managerUserId: row.manager_user_id
        }
      : null;
  }

  findDepartmentProfile(departmentId: string): DepartmentApprovalProfile | null {
    const row = this.db
      .prepare("SELECT id, name, manager_user_id FROM departments WHERE id = ? AND status = 'active'")
      .get(departmentId) as { id: string; name: string; manager_user_id: string | null } | undefined;
    return row ? { id: row.id, name: row.name, managerUserId: row.manager_user_id } : null;
  }

  findPrimaryDepartmentForUser(userId: string): DepartmentApprovalProfile | null {
    const row = this.db
      .prepare(`
        SELECT d.id, d.name, d.manager_user_id
        FROM user_departments ud
        INNER JOIN departments d ON d.id = ud.department_id
        WHERE ud.user_id = ? AND d.status = 'active'
        LIMIT 1
      `)
      .get(userId) as { id: string; name: string; manager_user_id: string | null } | undefined;
    return row ? { id: row.id, name: row.name, managerUserId: row.manager_user_id } : null;
  }

  userHasPermission(userId: string, permissionCode: string): boolean {
    const row = this.db
      .prepare(`
        SELECT 1
        FROM user_system_roles usr
        INNER JOIN system_roles sr ON sr.id = usr.role_id AND sr.status = 'active'
        INNER JOIN system_role_permissions srp ON srp.role_id = sr.id
        INNER JOIN system_permissions sp ON sp.id = srp.permission_id
        WHERE usr.user_id = ? AND sp.code = ?
        LIMIT 1
      `)
      .get(userId, permissionCode) as { 1: number } | undefined;
    return !!row;
  }

  findDefaultTemplate(): ApprovalTemplateWithStages | null {
    this.seedDefaultTemplateIfMissing();
    const template = this.db
      .prepare("SELECT id, code, name FROM approval_templates WHERE code = ? AND status = 'active'")
      .get(DEFAULT_APPROVAL_TEMPLATE_CODE) as { id: string; code: string; name: string } | undefined;
    if (!template) {
      return null;
    }
    const stages = this.db
      .prepare(`
        SELECT id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort
        FROM approval_template_stages
        WHERE template_id = ?
        ORDER BY sort ASC, created_at ASC
      `)
      .all(template.id) as Array<{
        id: string;
        template_id: string;
        stage_code: string;
        stage_name: string;
        stage_type: string;
        resolver_type: string;
        resolver_ref: string | null;
        sort: number;
      }>;
    return {
      id: template.id,
      code: template.code,
      name: template.name,
      stages: stages.map((stage) => ({
        id: stage.id,
        templateId: stage.template_id,
        stageCode: stage.stage_code,
        stageName: stage.stage_name,
        stageType: stage.stage_type,
        resolverType: stage.resolver_type,
        resolverRef: stage.resolver_ref,
        sort: stage.sort
      }))
    };
  }

  listTemplateStages(templateId: string): ApprovalTemplateStage[] {
    const stages = this.db
      .prepare(`
        SELECT id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort
        FROM approval_template_stages
        WHERE template_id = ?
        ORDER BY sort ASC, created_at ASC
      `)
      .all(templateId) as Array<{
        id: string;
        template_id: string;
        stage_code: string;
        stage_name: string;
        stage_type: string;
        resolver_type: string;
        resolver_ref: string | null;
        sort: number;
      }>;
    return stages.map((stage) => ({
      id: stage.id,
      templateId: stage.template_id,
      stageCode: stage.stage_code,
      stageName: stage.stage_name,
      stageType: stage.stage_type,
      resolverType: stage.resolver_type,
      resolverRef: stage.resolver_ref,
      sort: stage.sort
    }));
  }

  listActiveRoleUsers(roleId: string): UserApprovalProfile[] {
    const rows = this.db
      .prepare(`
        SELECT u.id, u.username, u.display_name, u.manager_user_id
        FROM user_system_roles usr
        INNER JOIN users u ON u.id = usr.user_id AND u.status = 'active'
        INNER JOIN system_roles sr ON sr.id = usr.role_id AND sr.status = 'active'
        WHERE usr.role_id = ?
        ORDER BY u.display_name ASC, u.username ASC
      `)
      .all(roleId) as Array<{
        id: string;
        username: string;
        display_name: string | null;
        manager_user_id: string | null;
      }>;
    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      managerUserId: row.manager_user_id
    }));
  }

  createClaim(claim: ReimbursementClaimEntity): void {
    this.db.prepare(`
      INSERT INTO reimbursement_claims (
        id, claim_no, claim_type, status, applicant_user_id, applicant_name, department_id, department_name,
        reason, fill_date, travel_start_date, travel_start_half, travel_end_date, travel_end_half, travel_days, receipt_count,
        total_amount_cents, advance_amount_cents, balance_amount_cents,
        current_stage_code, current_stage_name, submitted_at, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      claim.id,
      claim.claimNo,
      claim.claimType,
      claim.status,
      claim.applicantUserId,
      claim.applicantName,
      claim.departmentId,
      claim.departmentName,
      claim.reason,
      claim.fillDate,
      claim.travelStartDate,
      claim.travelStartHalf,
      claim.travelEndDate,
      claim.travelEndHalf,
      claim.travelDays,
      claim.receiptCount,
      toCents(claim.totalAmount),
      toCents(claim.advanceAmount),
      toCents(claim.balanceAmount),
      claim.currentStageCode,
      claim.currentStageName,
      claim.submittedAt,
      claim.completedAt,
      claim.createdAt,
      claim.updatedAt
    );
  }

  updateClaim(claim: ReimbursementClaimEntity): void {
    this.db.prepare(`
      UPDATE reimbursement_claims
      SET status = ?, department_id = ?, department_name = ?, reason = ?, fill_date = ?,
          travel_start_date = ?, travel_start_half = ?, travel_end_date = ?, travel_end_half = ?, travel_days = ?, receipt_count = ?,
          total_amount_cents = ?, advance_amount_cents = ?, balance_amount_cents = ?,
          current_stage_code = ?, current_stage_name = ?, submitted_at = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      claim.status,
      claim.departmentId,
      claim.departmentName,
      claim.reason,
      claim.fillDate,
      claim.travelStartDate,
      claim.travelStartHalf,
      claim.travelEndDate,
      claim.travelEndHalf,
      claim.travelDays,
      claim.receiptCount,
      toCents(claim.totalAmount),
      toCents(claim.advanceAmount),
      toCents(claim.balanceAmount),
      claim.currentStageCode,
      claim.currentStageName,
      claim.submittedAt,
      claim.completedAt,
      claim.updatedAt,
      claim.id
    );
  }

  findClaimById(id: string): ReimbursementClaimEntity | null {
    const row = this.db.prepare("SELECT * FROM reimbursement_claims WHERE id = ?").get(id) as ClaimRow | undefined;
    return row ? this.mapClaim(row) : null;
  }

  replaceItems(claimId: string, items: ReimbursementItemEntity[]): void {
    this.db.prepare("DELETE FROM reimbursement_items WHERE claim_id = ?").run(claimId);
    if (items.length === 0) {
      return;
    }
    const insert = this.db.prepare(`
      INSERT INTO reimbursement_items (
        id, claim_id, item_type, category, description, occurred_date, start_date, end_date,
        from_location, to_location, amount_cents, meta_json, sort, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of items) {
      insert.run(
        item.id,
        claimId,
        item.itemType,
        item.category,
        item.description,
        item.occurredDate,
        item.startDate,
        item.endDate,
        item.fromLocation,
        item.toLocation,
        toCents(item.amount),
        item.meta ? JSON.stringify(item.meta) : null,
        item.sort,
        item.createdAt,
        item.updatedAt
      );
    }
  }

  listItems(claimId: string): ReimbursementItemEntity[] {
    const rows = this.db
      .prepare("SELECT * FROM reimbursement_items WHERE claim_id = ? ORDER BY sort ASC, created_at ASC")
      .all(claimId) as ItemRow[];
    return rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      itemType: row.item_type,
      category: row.category,
      description: row.description,
      occurredDate: row.occurred_date,
      startDate: row.start_date,
      endDate: row.end_date,
      fromLocation: row.from_location,
      toLocation: row.to_location,
      amount: toAmount(row.amount_cents),
      meta: row.meta_json ? JSON.parse(row.meta_json) as Record<string, unknown> : null,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  createTasks(tasks: ReimbursementApprovalTaskEntity[]): void {
    if (tasks.length === 0) {
      return;
    }
    const insert = this.db.prepare(`
      INSERT INTO reimbursement_approval_tasks (
        id, claim_id, template_id, template_stage_id, stage_code, stage_name, stage_type, resolver_type,
        resolver_ref, assignee_user_id, assignee_name, status, sort, parent_task_id, transferred_from_task_id,
        comment, acted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const task of tasks) {
      insert.run(
        task.id,
        task.claimId,
        task.templateId,
        task.templateStageId,
        task.stageCode,
        task.stageName,
        task.stageType,
        task.resolverType,
        task.resolverRef,
        task.assigneeUserId,
        task.assigneeName,
        task.status,
        task.sort,
        task.parentTaskId,
        task.transferredFromTaskId,
        task.comment,
        task.actedAt,
        task.createdAt,
        task.updatedAt
      );
    }
  }

  deleteTasksForClaim(claimId: string): void {
    this.db.prepare("DELETE FROM reimbursement_approval_tasks WHERE claim_id = ?").run(claimId);
  }

  updateTask(task: ReimbursementApprovalTaskEntity): void {
    this.db.prepare(`
      UPDATE reimbursement_approval_tasks
      SET status = ?, comment = ?, acted_at = ?, updated_at = ?
      WHERE id = ?
    `).run(task.status, task.comment, task.actedAt, task.updatedAt, task.id);
  }

  cancelOpenTasks(claimId: string, updatedAt: string): void {
    this.db
      .prepare("UPDATE reimbursement_approval_tasks SET status = 'cancelled', updated_at = ? WHERE claim_id = ? AND status IN ('pending', 'addsign_pending')")
      .run(updatedAt, claimId);
  }

  activateTasksBySort(claimId: string, sort: number, updatedAt: string): ReimbursementApprovalTaskEntity[] {
    this.db
      .prepare("UPDATE reimbursement_approval_tasks SET status = 'pending', updated_at = ? WHERE claim_id = ? AND sort = ? AND status = 'cancelled' AND parent_task_id IS NULL")
      .run(updatedAt, claimId, sort);
    return this.listTasks(claimId).filter((task) => task.sort === sort && task.status === "pending" && !task.parentTaskId);
  }

  findTaskById(id: string): ReimbursementApprovalTaskEntity | null {
    const row = this.db.prepare("SELECT * FROM reimbursement_approval_tasks WHERE id = ?").get(id) as TaskRow | undefined;
    return row ? this.mapTask(row) : null;
  }

  listTasks(claimId: string): ReimbursementApprovalTaskEntity[] {
    const rows = this.db
      .prepare("SELECT * FROM reimbursement_approval_tasks WHERE claim_id = ? ORDER BY sort ASC, created_at ASC")
      .all(claimId) as TaskRow[];
    return rows.map((row) => this.mapTask(row));
  }

  findOpenSiblingTasks(task: ReimbursementApprovalTaskEntity): ReimbursementApprovalTaskEntity[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM reimbursement_approval_tasks
        WHERE claim_id = ? AND stage_code = ? AND sort = ? AND status IN ('pending', 'addsign_pending')
      `)
      .all(task.claimId, task.stageCode, task.sort) as TaskRow[];
    return rows.map((row) => this.mapTask(row));
  }

  addAttachment(id: string, claimId: string, input: AttachReimbursementUploadInput, userId: string | null, createdAt: string): void {
    this.db
      .prepare("INSERT OR IGNORE INTO reimbursement_attachments (id, claim_id, upload_id, category, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, claimId, input.uploadId, input.category, userId, createdAt);
  }

  deleteAttachment(claimId: string, attachmentId: string): boolean {
    return this.db.prepare("DELETE FROM reimbursement_attachments WHERE claim_id = ? AND id = ?").run(claimId, attachmentId).changes > 0;
  }

  uploadExists(uploadId: string): boolean {
    const row = this.db.prepare("SELECT 1 FROM uploads WHERE id = ? AND status = 'active'").get(uploadId) as { 1: number } | undefined;
    return !!row;
  }

  listAttachments(claimId: string): ReimbursementAttachmentEntity[] {
    const rows = this.db
      .prepare(`
        SELECT a.id, a.claim_id, a.upload_id, a.category, u.file_name, u.original_name, u.mime_type, u.file_size,
               a.created_by_user_id, a.created_at
        FROM reimbursement_attachments a
        LEFT JOIN uploads u ON u.id = a.upload_id
        WHERE a.claim_id = ?
        ORDER BY a.created_at ASC
      `)
      .all(claimId) as AttachmentRow[];
    return rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      uploadId: row.upload_id,
      category: row.category,
      fileName: row.file_name,
      originalName: row.original_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at
    }));
  }

  addLog(input: {
    id: string;
    claimId: string;
    actorUserId: string | null;
    actorName: string | null;
    action: ReimbursementLogAction;
    taskId?: string | null;
    comment?: string | null;
    createdAt: string;
  }): void {
    this.db
      .prepare("INSERT INTO reimbursement_logs (id, claim_id, actor_user_id, actor_name, action, task_id, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(input.id, input.claimId, input.actorUserId, input.actorName, input.action, input.taskId ?? null, input.comment ?? null, input.createdAt);
  }

  listLogs(claimId: string): ReimbursementLogEntity[] {
    const rows = this.db
      .prepare("SELECT * FROM reimbursement_logs WHERE claim_id = ? ORDER BY created_at ASC")
      .all(claimId) as LogRow[];
    return rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      action: row.action,
      taskId: row.task_id,
      comment: row.comment,
      createdAt: row.created_at
    }));
  }

  listClaims(query: ListReimbursementClaimsQuery, userId: string | null, canSeeAll: boolean): ReimbursementClaimListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const { whereClause, params } = this.buildClaimWhere(query, userId, canSeeAll);
    const total = (this.db.prepare(`SELECT COUNT(*) AS total FROM reimbursement_claims c ${whereClause}`).get(...params) as { total: number }).total;
    const rows = this.db
      .prepare(`SELECT c.* FROM reimbursement_claims c ${whereClause} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset) as ClaimRow[];
    return {
      items: rows.map((row) => this.mapClaim(row)),
      page,
      pageSize,
      total
    };
  }

  dashboard(userId: string): ReimbursementDashboard {
    const todoCount = (this.db.prepare("SELECT COUNT(*) AS total FROM reimbursement_approval_tasks WHERE assignee_user_id = ? AND status IN ('pending', 'addsign_pending')").get(userId) as { total: number }).total;
    const myApprovingCount = (this.db.prepare("SELECT COUNT(*) AS total FROM reimbursement_claims WHERE applicant_user_id = ? AND status IN ('submitted', 'approving')").get(userId) as { total: number }).total;
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const completedThisMonthAmount = toAmount((this.db.prepare("SELECT COALESCE(SUM(total_amount_cents), 0) AS total FROM reimbursement_claims WHERE status = 'completed' AND completed_at LIKE ?").get(`${monthPrefix}%`) as { total: number }).total);
    const recentTodos = this.db.prepare(`
      SELECT DISTINCT c.* FROM reimbursement_claims c
      INNER JOIN reimbursement_approval_tasks t ON t.claim_id = c.id
      WHERE t.assignee_user_id = ? AND t.status IN ('pending', 'addsign_pending')
      ORDER BY t.created_at DESC LIMIT 5
    `).all(userId) as ClaimRow[];
    const recentClaims = this.db.prepare("SELECT * FROM reimbursement_claims WHERE applicant_user_id = ? ORDER BY created_at DESC LIMIT 5").all(userId) as ClaimRow[];
    return {
      todoCount,
      myApprovingCount,
      completedThisMonthAmount,
      recentTodos: recentTodos.map((row) => this.mapClaim(row)),
      recentClaims: recentClaims.map((row) => this.mapClaim(row))
    };
  }

  stats(query: ReimbursementStatsQuery, userId: string | null, canSeeAll: boolean): ReimbursementStats {
    const { whereClause, params } = this.buildStatsWhere(query, userId, canSeeAll);
    const byMonth = this.db.prepare(`
      SELECT substr(fill_date, 1, 7) AS month, COALESCE(SUM(total_amount_cents), 0) AS total, COUNT(*) AS count
      FROM reimbursement_claims c ${whereClause}
      GROUP BY substr(fill_date, 1, 7)
      ORDER BY month ASC
    `).all(...params) as Array<{ month: string; total: number; count: number }>;
    const byType = this.db.prepare(`
      SELECT claim_type AS claimType, COALESCE(SUM(total_amount_cents), 0) AS total, COUNT(*) AS count
      FROM reimbursement_claims c ${whereClause}
      GROUP BY claim_type
    `).all(...params) as Array<{ claimType: ReimbursementClaimType; total: number; count: number }>;
    const byDepartment = this.db.prepare(`
      SELECT department_id AS departmentId, department_name AS departmentName, COALESCE(SUM(total_amount_cents), 0) AS total, COUNT(*) AS count
      FROM reimbursement_claims c ${whereClause}
      GROUP BY department_id, department_name
      ORDER BY total DESC
    `).all(...params) as Array<{ departmentId: string; departmentName: string; total: number; count: number }>;
    const byStatus = this.db.prepare(`
      SELECT status, COALESCE(SUM(total_amount_cents), 0) AS total, COUNT(*) AS count
      FROM reimbursement_claims c ${whereClause}
      GROUP BY status
    `).all(...params) as Array<{ status: ReimbursementClaimStatus; total: number; count: number }>;
    return {
      byMonth: byMonth.map((row) => ({ month: row.month, totalAmount: toAmount(row.total), count: row.count })),
      byType: byType.map((row) => ({ claimType: row.claimType, totalAmount: toAmount(row.total), count: row.count })),
      byDepartment: byDepartment.map((row) => ({ departmentId: row.departmentId, departmentName: row.departmentName, totalAmount: toAmount(row.total), count: row.count })),
      byStatus: byStatus.map((row) => ({ status: row.status, totalAmount: toAmount(row.total), count: row.count }))
    };
  }

  detail(claim: ReimbursementClaimEntity): Omit<ReimbursementClaimDetail, "approvalPreview"> {
    return {
      ...claim,
      items: this.listItems(claim.id),
      attachments: this.listAttachments(claim.id),
      tasks: this.listTasks(claim.id),
      logs: this.listLogs(claim.id)
    };
  }

  private buildClaimWhere(query: ListReimbursementClaimsQuery, userId: string | null, canSeeAll: boolean): { whereClause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.scope === "todo") {
      conditions.push("EXISTS (SELECT 1 FROM reimbursement_approval_tasks t WHERE t.claim_id = c.id AND t.assignee_user_id = ? AND t.status IN ('pending', 'addsign_pending'))");
      params.push(userId ?? "");
    } else if (query.scope === "my" || !canSeeAll) {
      conditions.push("c.applicant_user_id = ?");
      params.push(userId ?? "");
    }
    if (query.claimType) {
      conditions.push("c.claim_type = ?");
      params.push(query.claimType);
    }
    if (query.status) {
      conditions.push("c.status = ?");
      params.push(query.status);
    }
    if (query.departmentId?.trim()) {
      conditions.push("c.department_id = ?");
      params.push(query.departmentId.trim());
    }
    if (query.keyword?.trim()) {
      conditions.push("(c.claim_no LIKE ? OR c.reason LIKE ? OR c.applicant_name LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }
    if (query.dateFrom?.trim()) {
      conditions.push("c.fill_date >= ?");
      params.push(query.dateFrom.trim());
    }
    if (query.dateTo?.trim()) {
      conditions.push("c.fill_date <= ?");
      params.push(query.dateTo.trim());
    }
    return { whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
  }

  private buildStatsWhere(query: ReimbursementStatsQuery, userId: string | null, canSeeAll: boolean): { whereClause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (!canSeeAll) {
      conditions.push("c.applicant_user_id = ?");
      params.push(userId ?? "");
    }
    if (query.claimType) {
      conditions.push("c.claim_type = ?");
      params.push(query.claimType);
    }
    if (query.departmentId?.trim()) {
      conditions.push("c.department_id = ?");
      params.push(query.departmentId.trim());
    }
    if (query.dateFrom?.trim()) {
      conditions.push("c.fill_date >= ?");
      params.push(query.dateFrom.trim());
    }
    if (query.dateTo?.trim()) {
      conditions.push("c.fill_date <= ?");
      params.push(query.dateTo.trim());
    }
    return { whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
  }

  private mapClaim(row: ClaimRow): ReimbursementClaimEntity {
    return {
      id: row.id,
      claimNo: row.claim_no,
      claimType: row.claim_type,
      status: row.status,
      applicantUserId: row.applicant_user_id,
      applicantName: row.applicant_name,
      departmentId: row.department_id,
      departmentName: row.department_name,
      reason: row.reason,
      fillDate: row.fill_date,
      travelStartDate: row.travel_start_date,
      travelStartHalf: row.travel_start_half,
      travelEndDate: row.travel_end_date,
      travelEndHalf: row.travel_end_half,
      travelDays: row.travel_days,
      receiptCount: row.receipt_count,
      totalAmount: toAmount(row.total_amount_cents),
      advanceAmount: toAmount(row.advance_amount_cents),
      balanceAmount: toAmount(row.balance_amount_cents),
      currentStageCode: row.current_stage_code,
      currentStageName: row.current_stage_name,
      submittedAt: row.submitted_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapTask(row: TaskRow): ReimbursementApprovalTaskEntity {
    return {
      id: row.id,
      claimId: row.claim_id,
      templateId: row.template_id,
      templateStageId: row.template_stage_id,
      stageCode: row.stage_code,
      stageName: row.stage_name,
      stageType: row.stage_type,
      resolverType: row.resolver_type,
      resolverRef: row.resolver_ref,
      assigneeUserId: row.assignee_user_id,
      assigneeName: row.assignee_name,
      status: row.status,
      sort: row.sort,
      parentTaskId: row.parent_task_id,
      transferredFromTaskId: row.transferred_from_task_id,
      comment: row.comment,
      actedAt: row.acted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private seedDefaultTemplateIfMissing(): void {
    const existing = this.db
      .prepare("SELECT id FROM approval_templates WHERE code = ? LIMIT 1")
      .get(DEFAULT_APPROVAL_TEMPLATE_CODE) as { id: string } | undefined;
    if (existing) {
      return;
    }
    const now = new Date().toISOString();
    this.transaction(() => {
      this.db
        .prepare(`
          INSERT OR IGNORE INTO approval_templates (
            id, code, name, description, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          DEFAULT_APPROVAL_TEMPLATE_ID,
          DEFAULT_APPROVAL_TEMPLATE_CODE,
          "默认报销审批",
          "系统默认报销审批模板。",
          "active",
          now,
          now
        );
      const insertStage = this.db.prepare(`
        INSERT OR IGNORE INTO approval_template_stages (
          id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const stage of DEFAULT_APPROVAL_STAGE_SEEDS) {
        insertStage.run(
          stage.id,
          DEFAULT_APPROVAL_TEMPLATE_ID,
          stage.stageCode,
          stage.stageName,
          stage.stageType,
          stage.resolverType,
          stage.resolverRef,
          stage.sort,
          now,
          now
        );
      }
    });
  }
}
