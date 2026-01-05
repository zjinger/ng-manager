import type { FastifyInstance } from "fastify";
import * as  path from "node:path";
import { promises as fsp } from "node:fs";
import { AppError } from "@core";

type FsEntry = {
    name: string;
    fullPath: string;
    type: "dir" | "file" | "other";
    size?: number;
    mtimeMs?: number;
};

function normalizeInput(p: string) {
    // 支持 Windows / POSIX
    const trimmed = (p || "").trim();
    if (!trimmed) return "";
    return trimmed;
}

/**
 * 安全的 stat，出错返回 null
 * @param fullPath 
 * @returns 
 */
async function statSafe(fullPath: string) {
    try {
        return await fsp.stat(fullPath);
    } catch {
        return null;
    }
}

/** 是否是 Windows 盘符根目录，比如 C:\ 或 C:/ */
function isWindowsDriveRoot(absPath: string) {
    if (process.platform !== "win32") return false;
    const normalized = path.resolve(absPath).replace(/[\\/]+$/, ""); // 去尾斜杠
    return /^[a-zA-Z]:$/.test(normalized);
}

/** Windows 盘符根目录下的系统目录（默认隐藏） */
function isWindowsSystemEntry(name: string, parentAbs: string) {
    if (process.platform !== "win32") return false;
    if (!isWindowsDriveRoot(parentAbs)) return false;
    const deny = new Set(["System Volume Information", "$RECYCLE.BIN"]);
    return deny.has(name);
}

/**
 * 无权限目录直接跳过
 * @param p 
 * @returns 
 */
async function readdirSafe(p: string) {
    try {
        return await fsp.readdir(p, { withFileTypes: true });
    } catch (e: any) {
        if (e?.code === "EACCES" || e?.code === "EPERM") return null;
        throw e;
    }
}
/** 校验文件夹名：单级目录名，不允许路径分隔符/.. */
function validateDirName(name: string) {
    const n = (name || "").trim();
    if (!n) {
        throw new AppError("FS_INVALID_NAME" as any, "name is required", { name });
    }
    if (n === "." || n === "..") {
        throw new AppError("FS_INVALID_NAME" as any, "invalid name", { name: n });
    }
    // 不允许包含路径分隔符，避免注入子路径
    if (n.includes("/") || n.includes("\\") || n.includes(":")) {
        throw new AppError("FS_INVALID_NAME" as any, "name must be a single folder name", { name: n });
    }
    return n;
}

/** 
 * 解析并 realpath
 */
async function resolveReal(inputPath: string) {
    const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
    try {
        return await fsp.realpath(abs);
    } catch {
        throw new AppError("PROJECT_ROOT_INVALID" as any, "path not found", { path: abs });
    }
}
export default async function fsRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/fs/ls?path=...
     * 返回目录条目
     */
    fastify.get("/ls", async (req) => {
        const q = req.query as { path?: string; showSystem?: "0" | "1" | boolean };
        const input = normalizeInput(q.path || "");

        // 默认 false；showSystem=1 / true 才显示系统目录
        const showSystem =
            q.showSystem === "1" || q.showSystem === true || q.showSystem === ("true" as any);

        if (!input) {
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path is required", { path: input });
        }

        // 解析成绝对路径（相对路径按 server 进程 cwd 解析）
        const abs = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);

        // realpath 防止软链接/.. 等造成的奇怪路径
        let real: string;
        try {
            real = await fsp.realpath(abs);
        } catch {
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path not found", { path: abs });
        }

        const st = await statSafe(real);
        if (!st) {
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path not found", { path: real });
        }
        if (!st.isDirectory()) {
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path is not a directory", { path: real });
        }

        // const dirents = await fsp.readdir(real, { withFileTypes: true });
        const dirents = await readdirSafe(real) ?? [];

        const entries: FsEntry[] = [];
        for (const d of dirents) {
            // 按开关过滤 Windows 根目录系统项
            if (!showSystem && isWindowsSystemEntry(d.name, real)) continue;

            const fullPath = path.join(real, d.name);

            let type: FsEntry["type"] = "other";
            if (d.isDirectory()) {
                type = "dir";
                entries.push({
                    name: d.name,
                    fullPath,
                    type,
                });
            }
            // else if (d.isFile()) type = "file";

            // const st2 = await statSafe(fullPath);

            // entries.push({
            //     name: d.name,
            //     fullPath,
            //     type,
            //     size: st2?.isFile() ? st2.size : undefined,
            //     mtimeMs: st2?.mtimeMs,
            // });
        }

        // dirs first, then files, name sort
        entries.sort((a, b) => {
            if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        return {
            path: real,
            entries,
        };
    });
    /**
      * POST /api/fs/mkdir
      * body: { path: string; name: string }
      */
    fastify.post("/mkdir", async (req) => {
        const body = req.body as { path?: string; name?: string };
        const baseInput = normalizeInput(body?.path || "");
        if (!baseInput) {
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path is required", { path: baseInput });
        }
        const name = validateDirName(body?.name || "");
        const baseReal = await resolveReal(baseInput);
        const st = await statSafe(baseReal);
        if (!st) {
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path not found", { path: baseReal });
        }
        if (!st.isDirectory()) {
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path is not a directory", { path: baseReal });
        }
        const target = path.join(baseReal, name);
        // 如果已存在
        const st2 = await statSafe(target);
        if (st2) {
            if (st2.isDirectory()) {
                throw new AppError("FS_ALREADY_EXISTS" as any, "folder already exists", { path: target });
            }
            throw new AppError("FS_ALREADY_EXISTS" as any, "a file with same name exists", { path: target });
        }
        // 创建目录（仅创建一层；如需多层可改 recursive:true）
        try {
            await fsp.mkdir(target, { recursive: false });
        } catch (e: any) {
            // Windows 下常见：EPERM/EACCES
            if (e?.code === "EACCES" || e?.code === "EPERM") {
                throw new AppError("FS_PERMISSION_DENIED" as any, "permission denied", {
                    path: target,
                    code: e.code,
                });
            }
            throw e;
        }
        return {
            name,
            fullPath: target,
            type: "dir" as const,
        };
    });

}
