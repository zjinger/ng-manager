import * as path from "node:path";
import { promises as fsp, accessSync, constants } from "node:fs";
import type { FsEntry, FsListResult, FsLsOptions, FsMkdirOptions } from "./fs.types";
import { detectProjectKind } from "./fs.project-detect";
import {
    normalizeInput,
    resolveReal,
    statSafe,
    readdirSafe,
    isWindowsSystemEntry,
    validateDirName,
} from "./fs.path";
import { CoreError, CoreErrorCodes } from "../../common/errors";
import { FsService } from "./fs.service";

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<R>) {
    const ret: R[] = new Array(items.length);
    let i = 0;
    const run = async () => {
        while (i < items.length) {
            const cur = i++;
            ret[cur] = await worker(items[cur], cur);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
    return ret;
}

export class FsServiceImpl implements FsService {
    async ls(inputPath: string, opts: FsLsOptions = {}): Promise<FsListResult> {
        const input = normalizeInput(inputPath);
        if (!input) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "path is required", { path: input });
        }

        const showSystem = !!opts.showSystem;
        const detectProject = opts.detectProject !== false; // 默认 true
        const concurrency = opts.detectConcurrency ?? 8;

        const real = await resolveReal(input);

        const st = await statSafe(real);
        if (!st) throw new CoreError(CoreErrorCodes.FS_PATH_NOT_FOUND, "path not found", { path: real });
        if (!st.isDirectory())
            throw new CoreError(CoreErrorCodes.FS_PATH_NOT_FOUND, "path is not a directory", { path: real });

        const dirents = (await readdirSafe(real)) ?? [];

        const dirs: FsEntry[] = [];
        for (const d of dirents) {
            if (!showSystem && isWindowsSystemEntry(d.name, real)) continue;
            if (!d.isDirectory()) continue;

            dirs.push({ name: d.name, fullPath: path.join(real, d.name), type: "dir" });
        }

        if (detectProject && dirs.length > 0) {
            await mapLimit(dirs, concurrency, async (e) => {
                const detected = await detectProjectKind(e.fullPath);
                if (detected) {
                    e.projectKind = detected.kind;
                    e.projectHints = detected.hints;
                }
                return e;
            });
        }

        dirs.sort((a, b) => a.name.localeCompare(b.name));
        return { path: real, entries: dirs };
    }

    /**
     * 创建目录（支持多级路径）
     *
     * @param basePath 已存在的基础目录
     * @param name 相对路径（支持 a/b/c 或 a\b\c）
     * @param opts 创建选项
     */
    async mkdir(basePath: string, name: string, opts?: FsMkdirOptions): Promise<FsEntry> {
        const baseInput = normalizeInput(basePath);
        if (!baseInput) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "basePath is required", { path: baseInput });
        }

        const rawName = String(name ?? "").trim();
        if (!rawName) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "name is required", { name: rawName });
        }
        const baseReal = await resolveReal(baseInput);
        const st = await statSafe(baseReal);
        if (!st) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "basePath not found", { path: baseReal });
        }
        if (!st.isDirectory()) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "basePath is not a directory", { path: baseReal });
        }

        // ---------- 1) 规范化 & 校验路径 ----------
        // 统一分隔符
        const norm = rawName.replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "");
        if (!norm) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "name is invalid", { name: rawName });
        }

        // 禁止绝对路径（Windows / POSIX）
        if (
            path.isAbsolute(rawName) ||
            /^[a-zA-Z]:[\\/]/.test(rawName) || // C:\a
            /^\\\\/.test(rawName)              // \\server\share
        ) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "absolute path is not allowed", { name: rawName });
        }

        const parts = norm.split("/").filter(Boolean);
        if (parts.length === 0) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "name is invalid", { name: rawName });
        }

        // recursive=false 时，只允许单级
        const recursive = opts?.recursive ?? false;
        if (!recursive && parts.length > 1) {
            throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "recursive mkdir is disabled", { name: rawName });
        }

        // 逐段校验（复用既有规则）
        for (const seg of parts) {
            if (seg === "." || seg === "..") {
                throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "name contains invalid path segment", { name: rawName, seg });
            }
            validateDirName(seg);
        }

        const target = path.join(baseReal, ...parts);

        // ---------- 2) 目标存在性处理 ----------
        const overwrite = opts?.overwrite ?? false;
        const st2 = await statSafe(target);

        if (st2) {
            if (!overwrite) {
                if (st2.isDirectory()) {
                    throw new CoreError(CoreErrorCodes.FS_ALREADY_EXISTS, "folder already exists", { path: target });
                }
                throw new CoreError(CoreErrorCodes.FS_ALREADY_EXISTS, "a file with same name exists", { path: target });
            }

            // overwrite=true
            if (!st2.isDirectory()) {
                throw new CoreError(CoreErrorCodes.FS_ALREADY_EXISTS, "cannot overwrite non-directory", { path: target });
            }

            await fsp.rm(target, { recursive: true, force: true });
        }

        // ---------- 3) 创建目录 ----------
        try {
            await fsp.mkdir(target, { recursive });
        } catch (e: any) {
            if (e?.code === "EACCES" || e?.code === "EPERM") {
                throw new CoreError(
                    CoreErrorCodes.FS_PERMISSION_DENIED,
                    "permission denied",
                    { path: target, code: e.code }
                );
            }
            throw new CoreError(CoreErrorCodes.FS_MKDIR_FAILED, "mkdir failed", { path: target, error: e });
        }

        return {
            name: norm,          // 保留相对多级路径
            fullPath: target,
            type: "dir",
        };
    }

    /**
     * 路径是否存在
     * @param path 路径
     * @returns 是否存在
     */
    async exists(path: string): Promise<boolean> {
        const p = String(path ?? "").trim();
        if (!p) return false;
        try {
            return await this._exists(p);
        } catch (e: any) {
            throw new CoreError(CoreErrorCodes.FS_EXISTS_FAILED, e?.message ?? "fs exists failed", { path: p });
        }
    }

    /**
   * 路径是否存在
   * @param path
   * @returns
   */
    private async _exists(p: string): Promise<boolean> {
        try {
            accessSync(p, constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }
}
