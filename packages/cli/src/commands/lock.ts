import fs from "fs";
import path from "path";

export type LockInfo = {
    pid: number;
    port: number;
    startedAt: number;
};

export function getDataDir(): string {
    return process.env.NGM_DATA_DIR || path.join(process.env.USERPROFILE || "", ".ng-manager");
}

export function getLockPath(): string {
    return path.join(getDataDir(), "ngm.lock.json");
}

export function readLock(): LockInfo | null {
    const p = getLockPath();
    if (!fs.existsSync(p)) return null;
    try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw) as LockInfo;
    } catch {
        return null;
    }
}

export function writeLock(info: LockInfo) {
    const dir = getDataDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getLockPath(), JSON.stringify(info, null, 2), "utf-8");
}

export function clearLock() {
    const p = getLockPath();
    try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
        // ignore
    }
}
