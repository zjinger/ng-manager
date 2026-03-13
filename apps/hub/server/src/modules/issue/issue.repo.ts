import type Database from "better-sqlite3";
import type {
    IssueActionLogEntity,
    IssueCommentEntity,
    IssueCommentMentionEntity,
    IssueDetailResult,
    IssueParticipantEntity,
    IssueAttachmentEntity,
    IssueEntity,
    IssueListResult,
    IssueWatcherEntity,
    ListIssueQuery,
    UpdateIssueRepoPatch,
} from "./issue.types";

type IssueRow = {
    id: string;
    project_id: string;
    issue_no: string;
    title: string;
    description: string;
    type: string;
    status: string;
    priority: string;
    reporter_id: string | null;
    reporter_name: string | null;
    assignee_id: string | null;
    assignee_name: string | null;
    verifier_id: string | null;
    verifier_name: string | null;
    reopen_count: number;
    module: string | null;
    version: string | null;
    environment: string | null;
    resolved_at: string | null;
    verified_at: string | null;
    last_verified_result: "pass" | "fail" | null;
    close_reason_type: string | null;
    close_reason_text: string | null;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
};

type IssueCommentRow = {
    id: string;
    issue_id: string;
    author_id: string | null;
    author_name: string | null;
    content: string;
    mentions_json: string | null;
    created_at: string;
    updated_at: string;
};

type IssueActionLogRow = {
    id: string;
    issue_id: string;
    action_type: string;
    from_status: string | null;
    to_status: string | null;
    operator_id: string | null;
    operator_name: string | null;
    summary: string | null;
    meta_json: string | null;
    created_at: string;
};

type IssueParticipantRow = {
    id: string;
    issue_id: string;
    user_id: string;
    user_name: string | null;
    created_at: string;
};

type IssueWatcherRow = {
    id: string;
    issue_id: string;
    user_id: string;
    user_name: string | null;
    created_at: string;
};

type IssueAttachmentRow = {
    id: string;
    issue_id: string;
    upload_id: string;
    file_name: string;
    original_name: string;
    file_ext: string | null;
    mime_type: string | null;
    file_size: number;
    storage_path: string;
    storage_provider: string;
    uploader_id: string | null;
    uploader_name: string | null;
    created_at: string;
};

export class IssueRepo {
    constructor(private readonly db: Database.Database) { }

    runInTransaction<T>(handler: () => T): T {
        const tx = this.db.transaction(handler);
        return tx();
    }

    create(entity: IssueEntity): void {
        const stmt = this.db.prepare(`
      INSERT INTO issues (
        id,
        project_id,
        issue_no,
        title,
        description,
        type,
        status,
        priority,
        reporter_id,
        reporter_name,
        assignee_id,
        assignee_name,
        verifier_id,
        verifier_name,
        reopen_count,
        module,
        version,
        environment,
        resolved_at,
        verified_at,
        last_verified_result,
        close_reason_type,
        close_reason_text,
        closed_at,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @project_id,
        @issue_no,
        @title,
        @description,
        @type,
        @status,
        @priority,
        @reporter_id,
        @reporter_name,
        @assignee_id,
        @assignee_name,
        @verifier_id,
        @verifier_name,
        @reopen_count,
        @module,
        @version,
        @environment,
        @resolved_at,
        @verified_at,
        @last_verified_result,
        @close_reason_type,
        @close_reason_text,
        @closed_at,
        @created_at,
        @updated_at
      )
    `);

        stmt.run(this.toDbEntity(entity));
    }

    findById(id: string): IssueEntity | null {
        const row = this.db.prepare(`SELECT * FROM issues WHERE id = ?`).get(id) as IssueRow | undefined;
        return row ? this.toEntity(row) : null;
    }

    update(id: string, patch: UpdateIssueRepoPatch): boolean {
        const fields: string[] = [];
        const params: unknown[] = [];

        if (patch.title !== undefined) {
            fields.push("title = ?");
            params.push(patch.title);
        }
        if (patch.description !== undefined) {
            fields.push("description = ?");
            params.push(patch.description);
        }
        if (patch.priority !== undefined) {
            fields.push("priority = ?");
            params.push(patch.priority);
        }
        if (patch.module !== undefined) {
            fields.push("module = ?");
            params.push(patch.module ?? null);
        }
        if (patch.version !== undefined) {
            fields.push("version = ?");
            params.push(patch.version ?? null);
        }
        if (patch.environment !== undefined) {
            fields.push("environment = ?");
            params.push(patch.environment ?? null);
        }
        if (patch.status !== undefined) {
            fields.push("status = ?");
            params.push(patch.status);
        }
        if (patch.assigneeId !== undefined) {
            fields.push("assignee_id = ?");
            params.push(patch.assigneeId ?? null);
        }
        if (patch.assigneeName !== undefined) {
            fields.push("assignee_name = ?");
            params.push(patch.assigneeName ?? null);
        }
        if (patch.verifierId !== undefined) {
            fields.push("verifier_id = ?");
            params.push(patch.verifierId ?? null);
        }
        if (patch.verifierName !== undefined) {
            fields.push("verifier_name = ?");
            params.push(patch.verifierName ?? null);
        }
        if (patch.reopenCount !== undefined) {
            fields.push("reopen_count = ?");
            params.push(patch.reopenCount);
        }
        if (patch.resolvedAt !== undefined) {
            fields.push("resolved_at = ?");
            params.push(patch.resolvedAt ?? null);
        }
        if (patch.verifiedAt !== undefined) {
            fields.push("verified_at = ?");
            params.push(patch.verifiedAt ?? null);
        }
        if (patch.lastVerifiedResult !== undefined) {
            fields.push("last_verified_result = ?");
            params.push(patch.lastVerifiedResult ?? null);
        }
        if (patch.closeReasonType !== undefined) {
            fields.push("close_reason_type = ?");
            params.push(patch.closeReasonType ?? null);
        }
        if (patch.closeReasonText !== undefined) {
            fields.push("close_reason_text = ?");
            params.push(patch.closeReasonText ?? null);
        }
        if (patch.closedAt !== undefined) {
            fields.push("closed_at = ?");
            params.push(patch.closedAt ?? null);
        }

        fields.push("updated_at = ?");
        params.push(patch.updatedAt);
        params.push(id);

        const result = this.db.prepare(`UPDATE issues SET ${fields.join(", ")} WHERE id = ?`).run(...params);
        return result.changes > 0;
    }

    list(query: ListIssueQuery): IssueListResult {
        const where: string[] = [];
        const params: unknown[] = [];

        if (query.projectId) {
            where.push("project_id = ?");
            params.push(query.projectId);
        }
        if (query.status) {
            where.push("status = ?");
            params.push(query.status);
        }
        if (query.type) {
            where.push("type = ?");
            params.push(query.type);
        }
        if (query.priority) {
            where.push("priority = ?");
            params.push(query.priority);
        }
        if (query.keyword) {
            where.push("(issue_no LIKE ? OR title LIKE ? OR description LIKE ?)");
            params.push(`%${query.keyword}%`, `%${query.keyword}%`, `%${query.keyword}%`);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const offset = (query.page - 1) * query.pageSize;
        const totalRow = this.db.prepare(`SELECT COUNT(*) as total FROM issues ${whereSql}`).get(...params) as { total: number };
        const rows = this.db.prepare(`
        SELECT *
        FROM issues
        ${whereSql}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, query.pageSize, offset) as IssueRow[];

        return {
            items: rows.map((row) => this.toEntity(row)),
            page: query.page,
            pageSize: query.pageSize,
            total: totalRow.total
        };
    }

    createComment(entity: IssueCommentEntity): void {
        this.db.prepare(`
      INSERT INTO issue_comments (
        id, issue_id, author_id, author_name, content, mentions_json, created_at, updated_at
      ) VALUES (
        @id, @issue_id, @author_id, @author_name, @content, @mentions_json, @created_at, @updated_at
      )
    `).run({
            id: entity.id,
            issue_id: entity.issueId,
            author_id: entity.authorId ?? null,
            author_name: entity.authorName ?? null,
            content: entity.content,
            mentions_json: JSON.stringify(entity.mentions ?? []),
            created_at: entity.createdAt,
            updated_at: entity.updatedAt
        });
    }

    listComments(issueId: string): IssueCommentEntity[] {
        const rows = this.db.prepare(`
        SELECT *
        FROM issue_comments
        WHERE issue_id = ?
        ORDER BY created_at ASC
      `).all(issueId) as IssueCommentRow[];
        return rows.map((row) => this.toCommentEntity(row));
    }

    createActionLog(entity: IssueActionLogEntity): void {
        this.db.prepare(`
      INSERT INTO issue_action_logs (
        id, issue_id, action_type, from_status, to_status, operator_id, operator_name, summary, meta_json, created_at
      ) VALUES (
        @id, @issue_id, @action_type, @from_status, @to_status, @operator_id, @operator_name, @summary, @meta_json, @created_at
      )
    `).run({
            id: entity.id,
            issue_id: entity.issueId,
            action_type: entity.actionType,
            from_status: entity.fromStatus ?? null,
            to_status: entity.toStatus ?? null,
            operator_id: entity.operatorId ?? null,
            operator_name: entity.operatorName ?? null,
            summary: entity.summary ?? null,
            meta_json: entity.metaJson ?? null,
            created_at: entity.createdAt
        });
    }

    listActionLogs(issueId: string): IssueActionLogEntity[] {
        const rows = this.db.prepare(`
        SELECT *
        FROM issue_action_logs
        WHERE issue_id = ?
        ORDER BY created_at ASC
      `).all(issueId) as IssueActionLogRow[];
        return rows.map((row) => this.toActionLogEntity(row));
    }

    addParticipant(entity: IssueParticipantEntity): void {
        this.db.prepare(`
      INSERT INTO issue_participants (
        id, issue_id, user_id, user_name, created_at
      ) VALUES (
        @id, @issue_id, @user_id, @user_name, @created_at
      )
    `).run({
            id: entity.id,
            issue_id: entity.issueId,
            user_id: entity.userId,
            user_name: entity.userName ?? null,
            created_at: entity.createdAt
        });
    }

    removeParticipant(issueId: string, userId: string): boolean {
        const result = this.db.prepare(`DELETE FROM issue_participants WHERE issue_id = ? AND user_id = ?`).run(issueId, userId);
        return result.changes > 0;
    }

    listParticipants(issueId: string): IssueParticipantEntity[] {
        const rows = this.db.prepare(`
      SELECT *
      FROM issue_participants
      WHERE issue_id = ?
      ORDER BY created_at ASC
    `).all(issueId) as IssueParticipantRow[];
        return rows.map((row) => this.toIssueParticipantEntity(row));
    }

    hasParticipant(issueId: string, userId: string): boolean {
        const row = this.db.prepare(`
      SELECT 1 as matched
      FROM issue_participants
      WHERE issue_id = ? AND user_id = ?
      LIMIT 1
    `).get(issueId, userId) as { matched: number } | undefined;
        return !!row;
    }

    addWatcher(entity: IssueWatcherEntity): void {
        this.db.prepare(`
      INSERT INTO issue_watchers (
        id, issue_id, user_id, user_name, created_at
      ) VALUES (
        @id, @issue_id, @user_id, @user_name, @created_at
      )
    `).run({
            id: entity.id,
            issue_id: entity.issueId,
            user_id: entity.userId,
            user_name: entity.userName ?? null,
            created_at: entity.createdAt
        });
    }

    removeWatcher(issueId: string, userId: string): boolean {
        const result = this.db.prepare(`DELETE FROM issue_watchers WHERE issue_id = ? AND user_id = ?`).run(issueId, userId);
        return result.changes > 0;
    }

    listWatchers(issueId: string): IssueWatcherEntity[] {
        const rows = this.db.prepare(`
      SELECT *
      FROM issue_watchers
      WHERE issue_id = ?
      ORDER BY created_at ASC
    `).all(issueId) as IssueWatcherRow[];
        return rows.map((row) => this.toIssueWatcherEntity(row));
    }

    hasWatcher(issueId: string, userId: string): boolean {
        const row = this.db.prepare(`
      SELECT 1 as matched
      FROM issue_watchers
      WHERE issue_id = ? AND user_id = ?
      LIMIT 1
    `).get(issueId, userId) as { matched: number } | undefined;
        return !!row;
    }

    getDetail(id: string): IssueDetailResult | null {
        const issue = this.findById(id);
        if (!issue) return null;

        return {
            issue,
            participants: this.listParticipants(id),
            watchers: this.listWatchers(id),
            comments: this.listComments(id),
            logs: this.listActionLogs(id),
            attachments: this.listAttachments(id)
        };
    }

    createAttachment(entity: IssueAttachmentEntity): void {
        this.db.prepare(`
    INSERT INTO issue_attachments (
      id,
      issue_id,
      upload_id,
      created_at
    ) VALUES (
      @id,
      @issue_id,
      @upload_id,
      @created_at
    )
  `).run({
            id: entity.id,
            issue_id: entity.issueId,
            upload_id: entity.uploadId,
            created_at: entity.createdAt
        });
    }

    listAttachments(issueId: string): IssueAttachmentEntity[] {
        const rows = this.db.prepare(`
      SELECT
        ia.id,
        ia.issue_id,
        ia.upload_id,
        ia.created_at,
        u.file_name,
        u.original_name,
        u.file_ext,
        u.mime_type,
        u.file_size,
        u.storage_path,
        u.storage_provider,
        u.uploader_id,
        u.uploader_name
      FROM issue_attachments ia
      INNER JOIN uploads u ON u.id = ia.upload_id
      WHERE ia.issue_id = ? AND u.status <> 'deleted'
      ORDER BY ia.created_at ASC
    `).all(issueId) as IssueAttachmentRow[];
        return rows.map((row) => this.toAttachmentEntity(row));
    }

    findAttachmentById(id: string): IssueAttachmentEntity | null {
        const row = this.db.prepare(`
      SELECT
        ia.id,
        ia.issue_id,
        ia.upload_id,
        ia.created_at,
        u.file_name,
        u.original_name,
        u.file_ext,
        u.mime_type,
        u.file_size,
        u.storage_path,
        u.storage_provider,
        u.uploader_id,
        u.uploader_name
      FROM issue_attachments ia
      INNER JOIN uploads u ON u.id = ia.upload_id
      WHERE ia.id = ?
    `).get(id) as IssueAttachmentRow | undefined;
        return row ? this.toAttachmentEntity(row) : null;
    }

    deleteAttachment(id: string): boolean {
        const result = this.db.prepare(`DELETE FROM issue_attachments WHERE id = ?`).run(id);
        return result.changes > 0;
    }

    private toDbEntity(entity: IssueEntity) {
        return {
            id: entity.id,
            project_id: entity.projectId,
            issue_no: entity.issueNo,
            title: entity.title,
            description: entity.description,
            type: entity.type,
            status: entity.status,
            priority: entity.priority,
            reporter_id: entity.reporterId ?? null,
            reporter_name: entity.reporterName ?? null,
            assignee_id: entity.assigneeId ?? null,
            assignee_name: entity.assigneeName ?? null,
            verifier_id: entity.verifierId ?? null,
            verifier_name: entity.verifierName ?? null,
            reopen_count: entity.reopenCount,
            module: entity.module ?? null,
            version: entity.version ?? null,
            environment: entity.environment ?? null,
            resolved_at: entity.resolvedAt ?? null,
            verified_at: entity.verifiedAt ?? null,
            last_verified_result: entity.lastVerifiedResult ?? null,
            close_reason_type: entity.closeReasonType ?? null,
            close_reason_text: entity.closeReasonText ?? null,
            closed_at: entity.closedAt ?? null,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt
        };
    }

    private toEntity(row: IssueRow): IssueEntity {
        return {
            id: row.id,
            projectId: row.project_id,
            issueNo: row.issue_no,
            title: row.title,
            description: row.description,
            type: row.type as IssueEntity["type"],
            status: row.status as IssueEntity["status"],
            priority: row.priority as IssueEntity["priority"],
            reporterId: row.reporter_id,
            reporterName: row.reporter_name,
            assigneeId: row.assignee_id,
            assigneeName: row.assignee_name,
            verifierId: row.verifier_id,
            verifierName: row.verifier_name,
            reopenCount: row.reopen_count,
            module: row.module,
            version: row.version,
            environment: row.environment,
            resolvedAt: row.resolved_at,
            verifiedAt: row.verified_at,
            lastVerifiedResult: row.last_verified_result,
            closeReasonType: row.close_reason_type as IssueEntity["closeReasonType"],
            closeReasonText: row.close_reason_text,
            closedAt: row.closed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private toCommentEntity(row: IssueCommentRow): IssueCommentEntity {
        return {
            id: row.id,
            issueId: row.issue_id,
            authorId: row.author_id,
            authorName: row.author_name,
            content: row.content,
            mentions: this.parseMentionsJson(row.mentions_json),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private parseMentionsJson(value: string | null): IssueCommentMentionEntity[] {
        if (!value) {
            return [];
        }

        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .map((item) => ({
                    userId: typeof item?.userId === "string" ? item.userId.trim() : "",
                    displayName: typeof item?.displayName === "string" ? item.displayName.trim() : ""
                }))
                .filter((item) => item.userId.length > 0 && item.displayName.length > 0);
        } catch {
            return [];
        }
    }

    private toActionLogEntity(row: IssueActionLogRow): IssueActionLogEntity {
        return {
            id: row.id,
            issueId: row.issue_id,
            actionType: row.action_type as IssueActionLogEntity["actionType"],
            fromStatus: row.from_status as IssueActionLogEntity["fromStatus"],
            toStatus: row.to_status as IssueActionLogEntity["toStatus"],
            operatorId: row.operator_id,
            operatorName: row.operator_name,
            summary: row.summary,
            metaJson: row.meta_json,
            createdAt: row.created_at
        };
    }

    private toIssueParticipantEntity(row: IssueParticipantRow): IssueParticipantEntity {
        return {
            id: row.id,
            issueId: row.issue_id,
            userId: row.user_id,
            userName: row.user_name,
            createdAt: row.created_at
        };
    }

    private toIssueWatcherEntity(row: IssueWatcherRow): IssueWatcherEntity {
        return {
            id: row.id,
            issueId: row.issue_id,
            userId: row.user_id,
            userName: row.user_name,
            createdAt: row.created_at
        };
    }

    private toAttachmentEntity(row: IssueAttachmentRow): IssueAttachmentEntity {
        return {
            id: row.id,
            issueId: row.issue_id,
            uploadId: row.upload_id,
            fileName: row.file_name,
            originalName: row.original_name,
            fileExt: row.file_ext,
            mimeType: row.mime_type,
            fileSize: row.file_size,
            storagePath: row.storage_path,
            storageProvider: row.storage_provider as "local",
            uploaderId: row.uploader_id,
            uploaderName: row.uploader_name,
            createdAt: row.created_at
        };
    }
}








