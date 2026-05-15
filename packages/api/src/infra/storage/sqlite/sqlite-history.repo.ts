import type { ApiHistoryEntity } from "../../../domain/models";
import type { HistoryRepo } from "../../../domain/services";
import type { ApiScope } from "../../../domain/models/types";
import type { SqliteDatabase } from "@yinuo-ngm/storage";

function scopeKey(scope: ApiScope, projectId?: string) {
    return scope === "project" ? String(projectId ?? "").trim() : "";
}

function truncateBody(h: ApiHistoryEntity, bodyMaxChars = 200_000): ApiHistoryEntity {
    // 如果没有响应体，直接不处理
    if (!h.response) return h;

    const { bodyText, bodyBase64, ...restResponse } = h.response;
    let newText = bodyText;
    let newBase64 = bodyBase64;
    let isTruncated = false;

    // base64过长的情况下，强制修正 bodyType 的旗标
    let forceTextType = false;
    
    // 处理过长文本截断
    if (bodyText && bodyText.length > bodyMaxChars) {
        newText = bodyText.slice(0, bodyMaxChars) + "\n/* truncated */";
        isTruncated = true;
    }

    // 处理过长 Base64  (二进制文件截断没有意义，退化成文本说明)
    if (bodyBase64 && bodyBase64.length > bodyMaxChars) {
        newBase64 = undefined; // 彻底丢弃，不存这几十万长度的无用垃圾数据
        newText = `/* [System] Base64 data was omitted because it exceeded the size limit.
                    * Original Type: ${h.response.bodyType ?? "unknown"}
                    * Original Size: ${(bodyBase64.length / 1024).toFixed(1)} KB
                    */`;
        isTruncated = true;
        forceTextType = true;
    }

    // 如果都没有超限，直接原样返回，避免生成新对象
    if (!isTruncated) return h;

    // 计算真实的 bodySize
    const originalSize = h.response.bodySize ?? (bodyText ? bodyText.length : bodyBase64?.length ?? 0);
    // 最终的bodyType，如果强制文本化则为"text"，否则保持原有类型
    const finalBodyType = forceTextType ? "text" : (h.response.bodyType ?? "text");
    return {
        ...h,
        response: {
            status: h.response?.status!,
            statusText: h.response?.statusText,
            headers: h.response?.headers ?? {},
            bodyType: finalBodyType,
            bodyText: newText,
            bodyBase64: newBase64,
            bodySize: h.response.bodySize ?? originalSize,
        },
    };
}

export class SqliteHistoryRepo implements HistoryRepo {
    constructor(
        private readonly db: SqliteDatabase,
        private readonly bodyMaxChars = 200_000
    ) {}

    async add(h: ApiHistoryEntity, scope: ApiScope, projectId?: string): Promise<void> {
        const safe = truncateBody(h, this.bodyMaxChars);
        const stmt = this.db.prepare(`
            INSERT INTO api_history (id, scope, project_id, created_at, value)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                scope = excluded.scope,
                project_id = excluded.project_id,
                created_at = excluded.created_at,
                value = excluded.value
        `);
        stmt.run(
            safe.id,
            scope,
            scopeKey(scope, projectId),
            safe.createdAt ?? Date.now(),
            JSON.stringify(safe)
        );
    }

    async list(query: { scope: ApiScope; projectId?: string; limit: number; offset: number }): Promise<ApiHistoryEntity[]> {
        const rows = this.db
            .prepare(`
                SELECT value FROM api_history
                WHERE scope = ? AND project_id = ?
                ORDER BY created_at DESC, rowid DESC
                LIMIT ? OFFSET ?
            `)
            .all(query.scope, scopeKey(query.scope, query.projectId), Math.max(0, query.limit), Math.max(0, query.offset)) as Array<{ value: string }>;
        return rows.map((row) => JSON.parse(row.value) as ApiHistoryEntity);
    }

    async purge(query: { scope: ApiScope; projectId?: string; olderThan?: number; maxCount?: number }): Promise<number> {
        const projectId = scopeKey(query.scope, query.projectId);
        const allRows = this.db
            .prepare(`
                SELECT id, created_at FROM api_history
                WHERE scope = ? AND project_id = ?
                ORDER BY created_at DESC, rowid DESC
            `)
            .all(query.scope, projectId) as Array<{ id: string; created_at: number }>;

        let keptIds = allRows.map((row) => row.id);

        if (typeof query.olderThan === "number") {
            keptIds = keptIds.filter((_, idx) => (allRows[idx]?.created_at ?? 0) >= query.olderThan!);
        }

        if (typeof query.maxCount === "number") {
            keptIds = keptIds.slice(0, Math.max(0, query.maxCount));
        }

        const kept = new Set(keptIds);
        const removed = allRows.filter((row) => !kept.has(row.id));
        if (removed.length === 0) return 0;

        const del = this.db.prepare(`DELETE FROM api_history WHERE id = ?`);
        const tx = this.db.transaction(() => {
            for (const row of removed) {
                del.run(row.id);
            }
        });
        tx();

        return removed.length;
    }
}
