import type Database from "better-sqlite3";
import type {
    IssueActionLogEntity,
    IssueCommentEntity,
    IssueCommentMentionEntity,
    IssueDetailResult,
    IssueAttachmentEntity,
    IssueEntity,
    IssueListResult,
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
    fixed_at: string | null;
    verified_at: string | null;
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
    created_at: string;
};

type IssueAttachmentRow = {
    id: string;
    issue_id: string;
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
        fixed_at,
        verified_at,
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
        @fixed_at,
        @verified_at,
        @closed_at,
        @created_at,
        @updated_at
      )
    `);

        stmt.run(this.toDbEntity(entity));
    }

    findById(id: string): IssueEntity | null {
        const row = this.db
            .prepare(`SELECT * FROM issues WHERE id = ?`)
            .get(id) as IssueRow | undefined;

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

        if (patch.fixedAt !== undefined) {
            fields.push("fixed_at = ?");
            params.push(patch.fixedAt ?? null);
        }

        if (patch.verifiedAt !== undefined) {
            fields.push("verified_at = ?");
            params.push(patch.verifiedAt ?? null);
        }

        if (patch.closedAt !== undefined) {
            fields.push("closed_at = ?");
            params.push(patch.closedAt ?? null);
        }

        fields.push("updated_at = ?");
        params.push(patch.updatedAt);

        params.push(id);

        const result = this.db
            .prepare(`UPDATE issues SET ${fields.join(", ")} WHERE id = ?`)
            .run(...params);

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
            params.push(
                `%${query.keyword}%`,
                `%${query.keyword}%`,
                `%${query.keyword}%`
            );
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const offset = (query.page - 1) * query.pageSize;

        const totalRow = this.db
            .prepare(`SELECT COUNT(*) as total FROM issues ${whereSql}`)
            .get(...params) as { total: number };

        const rows = this.db
            .prepare(`
        SELECT *
        FROM issues
        ${whereSql}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `)
            .all(...params, query.pageSize, offset) as IssueRow[];

        return {
            items: rows.map((row) => this.toEntity(row)),
            page: query.page,
            pageSize: query.pageSize,
            total: totalRow.total
        };
    }

    createComment(entity: IssueCommentEntity): void {
        const stmt = this.db.prepare(`
      INSERT INTO issue_comments (
        id, issue_id, author_id, author_name, content, mentions_json, created_at, updated_at
      ) VALUES (
        @id, @issue_id, @author_id, @author_name, @content, @mentions_json, @created_at, @updated_at
      )
    `);

        stmt.run({
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
        const rows = this.db
            .prepare(`
        SELECT *
        FROM issue_comments
        WHERE issue_id = ?
        ORDER BY created_at ASC
      `)
            .all(issueId) as IssueCommentRow[];

        return rows.map((row) => this.toCommentEntity(row));
    }

    createActionLog(entity: IssueActionLogEntity): void {
        const stmt = this.db.prepare(`
      INSERT INTO issue_action_logs (
        id, issue_id, action_type, from_status, to_status, operator_id, operator_name, summary, created_at
      ) VALUES (
        @id, @issue_id, @action_type, @from_status, @to_status, @operator_id, @operator_name, @summary, @created_at
      )
    `);

        stmt.run({
            id: entity.id,
            issue_id: entity.issueId,
            action_type: entity.actionType,
            from_status: entity.fromStatus ?? null,
            to_status: entity.toStatus ?? null,
            operator_id: entity.operatorId ?? null,
            operator_name: entity.operatorName ?? null,
            summary: entity.summary ?? null,
            created_at: entity.createdAt
        });
    }

    listActionLogs(issueId: string): IssueActionLogEntity[] {
        const rows = this.db
            .prepare(`
        SELECT *
        FROM issue_action_logs
        WHERE issue_id = ?
        ORDER BY created_at ASC
      `).all(issueId) as IssueActionLogRow[];
        return rows.map((row) => this.toActionLogEntity(row));
    }

    getDetail(id: string): IssueDetailResult | null {
        const issue = this.findById(id);
        if (!issue) return null;

        return {
            issue,
            comments: this.listComments(id),
            logs: this.listActionLogs(id),
            attachments: this.listAttachments(id),
        };
    }

    createAttachment(entity: IssueAttachmentEntity): void {
        const stmt = this.db.prepare(`
    INSERT INTO issue_attachments (
      id,
      issue_id,
      file_name,
      original_name,
      file_ext,
      mime_type,
      file_size,
      storage_path,
      storage_provider,
      uploader_id,
      uploader_name,
      created_at
    ) VALUES (
      @id,
      @issue_id,
      @file_name,
      @original_name,
      @file_ext,
      @mime_type,
      @file_size,
      @storage_path,
      @storage_provider,
      @uploader_id,
      @uploader_name,
      @created_at
    )
  `);

        stmt.run({
            id: entity.id,
            issue_id: entity.issueId,
            file_name: entity.fileName,
            original_name: entity.originalName,
            file_ext: entity.fileExt ?? null,
            mime_type: entity.mimeType ?? null,
            file_size: entity.fileSize,
            storage_path: entity.storagePath,
            storage_provider: entity.storageProvider,
            uploader_id: entity.uploaderId ?? null,
            uploader_name: entity.uploaderName ?? null,
            created_at: entity.createdAt
        });
    }

    listAttachments(issueId: string): IssueAttachmentEntity[] {
        const rows = this.db
            .prepare(`
      SELECT *
      FROM issue_attachments
      WHERE issue_id = ?
      ORDER BY created_at ASC
    `)
            .all(issueId) as IssueAttachmentRow[];

        return rows.map((row) => this.toAttachmentEntity(row));
    }

    findAttachmentById(id: string): IssueAttachmentEntity | null {
        const row = this.db
            .prepare(`
      SELECT *
      FROM issue_attachments
      WHERE id = ?
    `)
            .get(id) as IssueAttachmentRow | undefined;

        return row ? this.toAttachmentEntity(row) : null;
    }

    deleteAttachment(id: string): boolean {
        const result = this.db
            .prepare(`DELETE FROM issue_attachments WHERE id = ?`)
            .run(id);

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
            fixed_at: entity.fixedAt ?? null,
            verified_at: entity.verifiedAt ?? null,
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
            fixedAt: row.fixed_at,
            verifiedAt: row.verified_at,
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
            createdAt: row.created_at
        };
    }

    private toAttachmentEntity(row: IssueAttachmentRow): IssueAttachmentEntity {
        return {
            id: row.id,
            issueId: row.issue_id,
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
