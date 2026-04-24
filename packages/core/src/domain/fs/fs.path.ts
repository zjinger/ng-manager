import * as path from "node:path";
import { promises as fsp } from "node:fs";
import { CoreError, CoreErrorCodes } from "../../common/errors";

/**
 * 规范化输入路径
 */
export function normalizeInput(p: string): string {
    // 支持 Windows / POSIX
    const trimmed = (p || "").trim();
    return trimmed ? trimmed : "";
}
/**
 * 安全的 stat，出错返回 null
 * @param fullPath 
 * @returns 
 */
export async function statSafe(fullPath: string): Promise<import("fs").Stats | null> {
    try {
        return await fsp.stat(fullPath);
    } catch {
        return null;
    }
}

/** 是否是 Windows 盘符根目录，比如 C:\ 或 C:/ */
export function isWindowsDriveRoot(absPath: string): boolean {
    if (process.platform !== "win32") return false;
    const normalized = path.resolve(absPath).replace(/[\\/]+$/, ""); // 去尾斜杠
    return /^[a-zA-Z]:$/.test(normalized);
}

/** Windows 盘符根目录下的系统目录（默认隐藏） */
export function isWindowsSystemEntry(name: string, parentAbs: string): boolean {
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
export async function readdirSafe(p: string): Promise<import("fs").Dirent[] | null> {
    try {
        return await fsp.readdir(p, { withFileTypes: true });
    } catch (e: any) {
        if (e?.code === "EACCES" || e?.code === "EPERM") return null;
        throw e;
    }
}
/** 校验文件夹名：单级目录名，不允许路径分隔符/.. */
export function validateDirName(name: string): string {
    const n = (name || "").trim();
    if (!n) {
        throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "name is required", { name });
    }
    if (n === "." || n === "..") {
        throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "invalid name", { name: n });
    }
    // 不允许包含路径分隔符，避免注入子路径
    if (n.includes("/") || n.includes("\\") || n.includes(":")) {
        throw new CoreError(CoreErrorCodes.FS_INVALID_NAME, "name must be a single folder name", { name: n });
    }
    return n;
}
/** 
 * 解析并 realpath
 */
export async function resolveReal(inputPath: string): Promise<string> {
    const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
    try {
        return await fsp.realpath(abs);
    } catch {
        throw new CoreError(CoreErrorCodes.PROJECT_ROOT_INVALID, "path not found", { path: abs });
    }
}
