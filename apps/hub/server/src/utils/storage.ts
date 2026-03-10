import fs from "node:fs";
import path from "node:path";

export function ensureDirSync(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function safeBaseName(name: string): string {
    return path.basename(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

export function getFileExt(name: string): string | null {
    const ext = path.extname(name).trim().toLowerCase();
    return ext ? ext : null;
}

export function buildStoredFileName(originalName: string): string {
    const safeName = safeBaseName(originalName);
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    const now = new Date();
    const ts =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        "_" +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");

    const rand = Math.random().toString(36).slice(2, 8);

    return `${ts}_${rand}_${base}${ext}`;
}