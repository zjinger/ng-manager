import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListRdTaskSheetsQuery,
  ListRdTaskSheetDefaultRoutesQuery,
  RdTaskSheetDefaultRouteEntity,
  RdTaskSheetDefaultRouteStatus,
  RdTaskSheetAction,
  RdTaskSheetAttachmentEntity,
  RdTaskSheetBusinessType,
  RdTaskSheetDetail,
  RdTaskSheetEntity,
  RdTaskSheetLinkedTargetEntity,
  RdTaskSheetLinkedTargetType,
  RdTaskSheetListResult,
  RdTaskSheetLogEntity,
  RdTaskSheetResult,
  RdTaskSheetStatus,
  RdTaskSheetUrgency,
  UserDisplayProfile
} from "./rd-task-sheet.types";

type SheetRow = {
  id: string;
  project_id: string | null;
  sheet_no: string;
  status: RdTaskSheetStatus;
  title: string;
  issue_date: string;
  issuer_department: string | null;
  issuer_user_id: string | null;
  issuer_name: string;
  receiver_department: string | null;
  receiver_user_id: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  processor_user_id: string | null;
  processor_name: string | null;
  customer_company: string | null;
  customer_contact: string | null;
  customer_phone: string | null;
  project_name: string | null;
  project_contact: string | null;
  related_system: string | null;
  urgency: RdTaskSheetUrgency;
  business_type: RdTaskSheetBusinessType;
  expected_resolved_at: string | null;
  resolved_at: string | null;
  result: RdTaskSheetResult | null;
  business_description: string;
  delivery_content: string | null;
  close_reason: string | null;
  converted_rd_item_id: string | null;
  converted_issue_id: string | null;
  creator_id: string;
  creator_name: string;
  prepared_by_name: string | null;
  reviewer_user_id: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  assigned_at: string | null;
  assignment_comment: string | null;
  issued_at: string | null;
  processing_started_at: string | null;
  replied_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  id: string;
  sheet_id: string;
  upload_id: string;
  file_name: string | null;
  original_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_by_user_id: string | null;
  created_at: string;
};

type LogRow = {
  id: string;
  sheet_id: string;
  action: RdTaskSheetAction;
  actor_user_id: string | null;
  actor_name: string | null;
  comment: string | null;
  meta_json: string | null;
  created_at: string;
};

type LinkRow = {
  id: string;
  sheet_id: string;
  target_type: RdTaskSheetLinkedTargetType;
  target_id: string;
  target_no: string | null;
  title: string | null;
  status: string | null;
  completed: number;
  created_by_user_id: string | null;
  created_at: string;
};

type DefaultRouteRow = {
  id: string;
  issuer_user_id: string | null;
  issuer_name: string | null;
  issuer_department: string | null;
  receiver_user_id: string | null;
  receiver_name: string | null;
  receiver_department: string | null;
  receiver_phone: string | null;
  status: RdTaskSheetDefaultRouteStatus;
  remark: string | null;
  sort: number;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateTaskSheetRowInput = Omit<RdTaskSheetEntity, "attachments" | "logs">;

export type UpdateTaskSheetRowInput = Partial<{
  project_id: string | null;
  sheet_no: string;
  status: RdTaskSheetStatus;
  title: string;
  issue_date: string;
  issuer_department: string | null;
  issuer_user_id: string | null;
  issuer_name: string;
  receiver_department: string | null;
  receiver_user_id: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  processor_user_id: string | null;
  processor_name: string | null;
  customer_company: string | null;
  customer_contact: string | null;
  customer_phone: string | null;
  project_name: string | null;
  project_contact: string | null;
  related_system: string | null;
  urgency: RdTaskSheetUrgency;
  business_type: RdTaskSheetBusinessType;
  expected_resolved_at: string | null;
  resolved_at: string | null;
  result: RdTaskSheetResult | null;
  business_description: string;
  delivery_content: string | null;
  close_reason: string | null;
  converted_rd_item_id: string | null;
  converted_issue_id: string | null;
  prepared_by_name: string | null;
  reviewer_user_id: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  assigned_at: string | null;
  assignment_comment: string | null;
  processor_started_at: string | null;
  issued_at: string | null;
  processing_started_at: string | null;
  replied_at: string | null;
  closed_at: string | null;
  updated_at: string;
}>;

export interface ListVisibilityInput {
  userId: string;
  accessibleProjectIds: string[];
  canManage: boolean;
  canReviewWorkflow?: boolean;
  canAssignWorkflow?: boolean;
}

export interface CreateTaskSheetLinkInput {
  id: string;
  sheetId: string;
  targetType: RdTaskSheetLinkedTargetType;
  targetId: string;
  createdByUserId: string | null;
  createdAt: string;
}

export type CreateDefaultRouteRowInput = RdTaskSheetDefaultRouteEntity;

export type UpdateDefaultRouteRowInput = Partial<{
  issuer_user_id: string | null;
  issuer_name: string | null;
  issuer_department: string | null;
  receiver_user_id: string | null;
  receiver_name: string | null;
  receiver_department: string | null;
  receiver_phone: string | null;
  status: RdTaskSheetDefaultRouteStatus;
  remark: string | null;
  sort: number;
  updated_by_user_id: string | null;
  updated_at: string;
}>;

export class RdTaskSheetRepo {
  constructor(private readonly db: Database.Database) {}

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  nextSheetSequence(prefix: string): number {
    const row = this.db
      .prepare(
        `
          SELECT COALESCE(MAX(CAST(SUBSTR(sheet_no, ?) AS INTEGER)), 0) AS max
          FROM rd_task_sheets
          WHERE sheet_no LIKE ? AND LENGTH(sheet_no) = ?
        `
      )
      .get(prefix.length + 1, `${prefix}%`, prefix.length + 4) as { max: number };
    return row.max + 1;
  }

  existsSheetNo(sheetNo: string, excludeId?: string): boolean {
    const row = excludeId
      ? (this.db.prepare("SELECT 1 AS hit FROM rd_task_sheets WHERE sheet_no = ? AND id <> ?").get(sheetNo, excludeId) as { hit: number } | undefined)
      : (this.db.prepare("SELECT 1 AS hit FROM rd_task_sheets WHERE sheet_no = ?").get(sheetNo) as { hit: number } | undefined);
    return Boolean(row);
  }

  findUserProfile(userId: string): UserDisplayProfile | null {
    const row = this.db
      .prepare("SELECT id, username, display_name FROM users WHERE id = ? AND status = 'active'")
      .get(userId) as { id: string; username: string; display_name: string | null } | undefined;
    return row ? { id: row.id, username: row.username, displayName: row.display_name } : null;
  }

  listDefaultRoutes(query: ListRdTaskSheetDefaultRoutesQuery = {}): RdTaskSheetDefaultRouteEntity[] {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push(`(
        issuer_name LIKE ? OR issuer_department LIKE ? OR receiver_name LIKE ? OR
        receiver_department LIKE ? OR receiver_phone LIKE ? OR remark LIKE ?
      )`);
      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT * FROM rd_task_sheet_default_routes ${whereClause} ORDER BY sort ASC, updated_at DESC`)
      .all(...params) as DefaultRouteRow[];
    return rows.map((row) => this.mapDefaultRoute(row));
  }

  createDefaultRoute(entity: CreateDefaultRouteRowInput): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_task_sheet_default_routes (
            id, issuer_user_id, issuer_name, issuer_department,
            receiver_user_id, receiver_name, receiver_department, receiver_phone,
            status, remark, sort, created_by_user_id, updated_by_user_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.issuerUserId,
        entity.issuerName,
        entity.issuerDepartment,
        entity.receiverUserId,
        entity.receiverName,
        entity.receiverDepartment,
        entity.receiverPhone,
        entity.status,
        entity.remark,
        entity.sort,
        entity.createdByUserId,
        entity.updatedByUserId,
        entity.createdAt,
        entity.updatedAt
      );
  }

  updateDefaultRoute(id: string, input: UpdateDefaultRouteRowInput): boolean {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      return false;
    }
    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    const params = entries.map(([, value]) => value);
    return this.db.prepare(`UPDATE rd_task_sheet_default_routes SET ${assignments} WHERE id = ?`).run(...params, id).changes > 0;
  }

  deleteDefaultRoute(id: string): boolean {
    return this.db.prepare("DELETE FROM rd_task_sheet_default_routes WHERE id = ?").run(id).changes > 0;
  }

  findDefaultRouteById(id: string): RdTaskSheetDefaultRouteEntity | null {
    const row = this.db.prepare("SELECT * FROM rd_task_sheet_default_routes WHERE id = ?").get(id) as DefaultRouteRow | undefined;
    return row ? this.mapDefaultRoute(row) : null;
  }

  findActiveDefaultRouteForIssuer(issuerUserId: string): RdTaskSheetDefaultRouteEntity | null {
    const row = this.db
      .prepare(
        `
          SELECT *
          FROM rd_task_sheet_default_routes
          WHERE status = 'active' AND issuer_user_id = ?
          ORDER BY sort ASC, updated_at DESC
          LIMIT 1
        `
      )
      .get(issuerUserId) as DefaultRouteRow | undefined;
    return row ? this.mapDefaultRoute(row) : null;
  }

  create(entity: RdTaskSheetEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_task_sheets (
            id, project_id, sheet_no, status, title, issue_date,
            issuer_department, issuer_user_id, issuer_name,
            receiver_department, receiver_user_id, receiver_name, receiver_phone,
            processor_user_id, processor_name,
            customer_company, customer_contact, customer_phone,
            project_name, project_contact, related_system,
            urgency, business_type, expected_resolved_at, resolved_at, result,
            business_description, delivery_content, close_reason, converted_rd_item_id, converted_issue_id,
            creator_id, creator_name, prepared_by_name, reviewer_user_id, reviewer_name, reviewed_at, review_comment,
            assigned_at, assignment_comment, issued_at, processing_started_at, replied_at, closed_at,
            created_at, updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?
          )
        `
      )
      .run(
        entity.id,
        entity.projectId,
        entity.sheetNo,
        entity.status,
        entity.title,
        entity.issueDate,
        entity.issuerDepartment,
        entity.issuerUserId,
        entity.issuerName,
        entity.receiverDepartment,
        entity.receiverUserId,
        entity.receiverName,
        entity.receiverPhone,
        entity.processorUserId,
        entity.processorName,
        entity.customerCompany,
        entity.customerContact,
        entity.customerPhone,
        entity.projectName,
        entity.projectContact,
        entity.relatedSystem,
        entity.urgency,
        entity.businessType,
        entity.expectedResolvedAt,
        entity.resolvedAt,
        entity.result,
        entity.businessDescription,
        entity.deliveryContent,
        entity.closeReason,
        entity.convertedRdItemId,
        entity.convertedIssueId,
        entity.creatorId,
        entity.creatorName,
        entity.preparedByName,
        entity.reviewerUserId,
        entity.reviewerName,
        entity.reviewedAt,
        entity.reviewComment,
        entity.assignedAt,
        entity.assignmentComment,
        entity.issuedAt,
        entity.processingStartedAt,
        entity.repliedAt,
        entity.closedAt,
        entity.createdAt,
        entity.updatedAt
      );
  }

  update(id: string, input: UpdateTaskSheetRowInput): boolean {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      return false;
    }
    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    const params = entries.map(([, value]) => value);
    return this.db.prepare(`UPDATE rd_task_sheets SET ${assignments} WHERE id = ?`).run(...params, id).changes > 0;
  }

  findById(id: string): RdTaskSheetEntity | null {
    const row = this.db.prepare("SELECT * FROM rd_task_sheets WHERE id = ?").get(id) as SheetRow | undefined;
    return row ? this.mapSheet(row) : null;
  }

  delete(id: string): boolean {
    return this.db.prepare("DELETE FROM rd_task_sheets WHERE id = ?").run(id).changes > 0;
  }

  getDetail(id: string): RdTaskSheetDetail | null {
    const entity = this.findById(id);
    if (!entity) {
      return null;
    }
    return {
      ...entity,
      attachments: this.listAttachments(id),
      logs: this.listLogs(id),
      linkedTargets: this.listLinkedTargets(id)
    };
  }

  list(query: ListRdTaskSheetsQuery, visibility: ListVisibilityInput): RdTaskSheetListResult {
    const page = normalizePage(query.page, query.pageSize);
    const { whereClause, params } = this.buildListWhere(query, visibility);
    const total = (this.db.prepare(`SELECT COUNT(*) AS total FROM rd_task_sheets ${whereClause}`).get(...params) as { total: number }).total;
    const rows = this.db
      .prepare(`SELECT * FROM rd_task_sheets ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, page.pageSize, (page.page - 1) * page.pageSize) as SheetRow[];
    return {
      items: rows.map((row) => this.mapSheet(row)),
      total,
      page: page.page,
      pageSize: page.pageSize
    };
  }

  addAttachment(entity: RdTaskSheetAttachmentEntity): void {
    this.db
      .prepare(
        `
          INSERT OR IGNORE INTO rd_task_sheet_attachments (id, sheet_id, upload_id, created_by_user_id, created_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(entity.id, entity.sheetId, entity.uploadId, entity.createdByUserId, entity.createdAt);
  }

  deleteAttachment(sheetId: string, attachmentId: string): boolean {
    return this.db
      .prepare("DELETE FROM rd_task_sheet_attachments WHERE sheet_id = ? AND id = ?")
      .run(sheetId, attachmentId).changes > 0;
  }

  addLink(entity: CreateTaskSheetLinkInput): void {
    this.db
      .prepare(
        `
          INSERT OR IGNORE INTO rd_task_sheet_links (id, sheet_id, target_type, target_id, created_by_user_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(entity.id, entity.sheetId, entity.targetType, entity.targetId, entity.createdByUserId, entity.createdAt);
  }

  listLinkedTargets(sheetId: string): RdTaskSheetLinkedTargetEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            l.id,
            l.sheet_id,
            l.target_type,
            l.target_id,
            r.rd_no AS target_no,
            r.title,
            r.status,
            CASE WHEN r.status IN ('accepted', 'closed') THEN 1 ELSE 0 END AS completed,
            l.created_by_user_id,
            l.created_at
          FROM rd_task_sheet_links l
          INNER JOIN rd_items r ON r.id = l.target_id
          WHERE l.sheet_id = ? AND l.target_type = 'rd_item'
          UNION ALL
          SELECT
            l.id,
            l.sheet_id,
            l.target_type,
            l.target_id,
            i.issue_no AS target_no,
            i.title,
            i.status,
            CASE WHEN i.status IN ('verified', 'closed') THEN 1 ELSE 0 END AS completed,
            l.created_by_user_id,
            l.created_at
          FROM rd_task_sheet_links l
          INNER JOIN issues i ON i.id = l.target_id
          WHERE l.sheet_id = ? AND l.target_type = 'issue'
          ORDER BY created_at ASC
        `
      )
      .all(sheetId, sheetId) as LinkRow[];
    return rows.map((row) => ({
      id: row.id,
      sheetId: row.sheet_id,
      targetType: row.target_type,
      targetId: row.target_id,
      targetNo: row.target_no,
      title: row.title,
      status: row.status,
      completed: row.completed === 1,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at
    }));
  }

  listAttachments(sheetId: string): RdTaskSheetAttachmentEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT a.*, u.file_name, u.original_name, u.mime_type, u.file_size
          FROM rd_task_sheet_attachments a
          INNER JOIN uploads u ON u.id = a.upload_id
          WHERE a.sheet_id = ?
          ORDER BY a.created_at ASC
        `
      )
      .all(sheetId) as AttachmentRow[];
    return rows.map((row) => ({
      id: row.id,
      sheetId: row.sheet_id,
      uploadId: row.upload_id,
      fileName: row.file_name,
      originalName: row.original_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at
    }));
  }

  createLog(entity: RdTaskSheetLogEntity): void {
    this.db
      .prepare(
        `
          INSERT INTO rd_task_sheet_logs (id, sheet_id, action, actor_user_id, actor_name, comment, meta_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        entity.id,
        entity.sheetId,
        entity.action,
        entity.actorUserId,
        entity.actorName,
        entity.comment,
        entity.metaJson,
        entity.createdAt
      );
  }

  listLogs(sheetId: string): RdTaskSheetLogEntity[] {
    const rows = this.db
      .prepare("SELECT * FROM rd_task_sheet_logs WHERE sheet_id = ? ORDER BY created_at ASC")
      .all(sheetId) as LogRow[];
    return rows.map((row) => ({
      id: row.id,
      sheetId: row.sheet_id,
      action: row.action,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      comment: row.comment,
      metaJson: row.meta_json,
      createdAt: row.created_at
    }));
  }

  private buildListWhere(query: ListRdTaskSheetsQuery, visibility: ListVisibilityInput): { whereClause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.scope === "workflow") {
      const workflowConditions: string[] = [];
      if (visibility.canManage || visibility.canReviewWorkflow) {
        workflowConditions.push("status = 'pending_review'");
      }
      if (visibility.canManage) {
        workflowConditions.push("(status IN ('issued', 'processing'))");
      } else if (visibility.canAssignWorkflow) {
        workflowConditions.push("(status IN ('issued', 'processing') AND (receiver_user_id = ? OR processor_user_id = ?))");
        params.push(visibility.userId, visibility.userId);
      }
      if (workflowConditions.length > 0) {
        conditions.push(`(${workflowConditions.join(" OR ")})`);
      } else if (!visibility.canManage) {
        conditions.push("1 = 0");
      }
    } else if (!visibility.canManage) {
      const visibleConditions = [
        "creator_id = ?",
        "issuer_user_id = ?",
        "receiver_user_id = ?",
        "processor_user_id = ?",
        "reviewer_user_id = ?"
      ];
      params.push(visibility.userId, visibility.userId, visibility.userId, visibility.userId, visibility.userId);
      if (visibility.accessibleProjectIds.length > 0) {
        visibleConditions.push(`project_id IN (${visibility.accessibleProjectIds.map(() => "?").join(", ")})`);
        params.push(...visibility.accessibleProjectIds);
      }
      conditions.push(`(${visibleConditions.join(" OR ")})`);
    }

    if (query.projectId?.trim()) {
      conditions.push("project_id = ?");
      params.push(query.projectId.trim());
    } else if (query.unlinked) {
      conditions.push("project_id IS NULL");
    }

    if (query.status?.length) {
      conditions.push(`status IN (${query.status.map(() => "?").join(", ")})`);
      params.push(...query.status);
    }
    if (query.issuerUserId?.trim()) {
      conditions.push("issuer_user_id = ?");
      params.push(query.issuerUserId.trim());
    }
    if (query.receiverUserId?.trim()) {
      conditions.push("receiver_user_id = ?");
      params.push(query.receiverUserId.trim());
    }
    if (query.processorUserId?.trim()) {
      conditions.push("processor_user_id = ?");
      params.push(query.processorUserId.trim());
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push(`(
        sheet_no LIKE ? OR title LIKE ? OR business_description LIKE ? OR delivery_content LIKE ? OR
        issuer_name LIKE ? OR receiver_name LIKE ? OR customer_company LIKE ? OR project_name LIKE ?
      )`);
      params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    }

    return {
      whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
      params
    };
  }

  private mapSheet(row: SheetRow): RdTaskSheetEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      sheetNo: row.sheet_no,
      status: row.status,
      title: row.title,
      issueDate: row.issue_date,
      issuerDepartment: row.issuer_department,
      issuerUserId: row.issuer_user_id,
      issuerName: row.issuer_name,
      receiverDepartment: row.receiver_department,
      receiverUserId: row.receiver_user_id,
      receiverName: row.receiver_name,
      receiverPhone: row.receiver_phone,
      processorUserId: row.processor_user_id,
      processorName: row.processor_name,
      customerCompany: row.customer_company,
      customerContact: row.customer_contact,
      customerPhone: row.customer_phone,
      projectName: row.project_name,
      projectContact: row.project_contact,
      relatedSystem: row.related_system,
      urgency: row.urgency,
      businessType: row.business_type,
      expectedResolvedAt: row.expected_resolved_at,
      resolvedAt: row.resolved_at,
      result: row.result,
      businessDescription: row.business_description,
      deliveryContent: row.delivery_content,
      closeReason: row.close_reason,
      convertedRdItemId: row.converted_rd_item_id,
      convertedIssueId: row.converted_issue_id,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      preparedByName: row.prepared_by_name,
      reviewerUserId: row.reviewer_user_id,
      reviewerName: row.reviewer_name,
      reviewedAt: row.reviewed_at,
      reviewComment: row.review_comment,
      assignedAt: row.assigned_at,
      assignmentComment: row.assignment_comment,
      issuedAt: row.issued_at,
      processingStartedAt: row.processing_started_at,
      repliedAt: row.replied_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapDefaultRoute(row: DefaultRouteRow): RdTaskSheetDefaultRouteEntity {
    return {
      id: row.id,
      issuerUserId: row.issuer_user_id,
      issuerName: row.issuer_name,
      issuerDepartment: row.issuer_department,
      receiverUserId: row.receiver_user_id,
      receiverName: row.receiver_name,
      receiverDepartment: row.receiver_department,
      receiverPhone: row.receiver_phone,
      status: row.status,
      remark: row.remark,
      sort: row.sort,
      createdByUserId: row.created_by_user_id,
      updatedByUserId: row.updated_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
