import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

import { ApiError, ApiErrorCodes } from "@yinuo-ngm/errors";
import { FileLock, atomicWrite, ensureDir } from "@yinuo-ngm/storage";
import type { ApiHistoryEntity } from "../../../domain/models";
import type { HistoryRepo } from "../../../domain/services";

export interface JsonHistoryRepoOptions {
    rootDir: string;          // <data>/api
    fileName?: string;        // default: history.jsonl
    bodyMaxChars?: number;    // default: 200_000
}

/**
 * jsonl append-only history repo
 *
 * 路径约定：
 * - global:  <rootDir>/global/history/history.jsonl
 * - project: <rootDir>/projects/<projectId>/history/history.jsonl
 */
export class JsonHistoryRepo implements HistoryRepo {
    private readonly rootDir: string;
    private readonly fileName: string;
    private readonly bodyMaxChars: number;
    private readonly lock = new FileLock();

    constructor(opts: JsonHistoryRepoOptions) {
        this.rootDir = opts.rootDir;
        this.fileName = opts.fileName ?? "history.jsonl";
        this.bodyMaxChars = opts.bodyMaxChars ?? 200_000;
    }

    async add(h: ApiHistoryEntity, scope: "global" | "project", projectId?: string): Promise<void> {
        const file = this.filePath(scope, projectId);

        // jsonl append 也要 ensure dir
        ensureDir(file);

        const safe = this.truncateBody(h);

        await this.lock.withLock(file, async () => {
            await fs.promises.appendFile(file, JSON.stringify(safe) + "\n", "utf8");
        });
    }

    async list(query: { scope: "global" | "project"; projectId?: string; limit: number; offset: number }): Promise<ApiHistoryEntity[]> {
        const file = this.filePath(query.scope, query.projectId);
        if (!fs.existsSync(file)) return [];

        // MVP：全量扫描；后续可以做索引/分页优化
        const all = await this.readAll(file);

        // 最新优先
        const sorted = all.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        const offset = Math.max(0, query.offset);
        const limit = Math.max(0, query.limit);
        return sorted.slice(offset, offset + limit);
    }

    async purge(query: { scope: "global" | "project"; projectId?: string; olderThan?: number; maxCount?: number }): Promise<number> {
        const file = this.filePath(query.scope, query.projectId);
        if (!fs.existsSync(file)) return 0;

        return await this.lock.withLock(file, async () => {
            const all = await this.readAll(file);
            let kept = all;

            if (typeof query.olderThan === "number") {
                kept = kept.filter((x) => (x.createdAt ?? 0) >= query.olderThan!);
            }

            if (typeof query.maxCount === "number") {
                // 保留最新 maxCount 条
                kept = kept.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, query.maxCount);
                // rewrite 时按旧->新
                kept = kept.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
            }

            const removed = all.length - kept.length;

            const text = kept.length ? kept.map((x) => JSON.stringify(x)).join("\n") + "\n" : "";
            atomicWrite(file, text);

            return removed;
        });
    }

    // ---------------- private ----------------

    private filePath(scope: "global" | "project", projectId?: string) {
        if (scope === "global") {
            return path.join(this.rootDir, "global", "history", this.fileName);
        }
        if (!projectId) throw new ApiError(ApiErrorCodes.API_PROJECT_ID_REQUIRED, "projectId is required when scope=project");
        return path.join(this.rootDir, "projects", projectId, "history", this.fileName);
    }

    private async readAll(file: string): Promise<ApiHistoryEntity[]> {
        const input = fs.createReadStream(file, { encoding: "utf8" });
        const rl = readline.createInterface({ input, crlfDelay: Infinity });

        const out: ApiHistoryEntity[] = [];
        for await (const line of rl) {
            const s = line.trim();
            if (!s) continue;
            try {
                out.push(JSON.parse(s));
            } catch {
                // ignore broken line
            }
        }
        return out;
    }

    private truncateBody(h: ApiHistoryEntity): ApiHistoryEntity {
        // 如果没有响应体，直接不处理
        if (!h.response) return h;

        const { bodyText, bodyBase64, ...restResponse } = h.response;
        let newText = bodyText;
        let newBase64 = bodyBase64;
        let isTruncated = false;

        // base64过长的情况下，强制修正 bodyType 的旗标
        let forceTextType = false;
        
        // 处理过长文本截断
        if (bodyText && bodyText.length > this.bodyMaxChars) {
            newText = bodyText.slice(0, this.bodyMaxChars) + "\n/* truncated */";
            isTruncated = true;
        }

        // 处理过长 Base64  (二进制文件截断没有意义，退化成文本说明)
        if (bodyBase64 && bodyBase64.length > this.bodyMaxChars) {
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
}
