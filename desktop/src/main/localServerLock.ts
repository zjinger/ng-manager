import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { LocalServerLockInfo } from "./localServerRuntime.js";

export function getLocalServerDataDir(): string {
    return process.env.NGM_DATA_DIR || path.join(os.homedir(), ".ng-manager");
}

export function getLocalServerLockPath(): string {
    return path.join(getLocalServerDataDir(), "ngm.lock.json");
}

export function readLocalServerLock(): LocalServerLockInfo | null {
    const lockPath = getLocalServerLockPath();
    if (!fs.existsSync(lockPath)) return null;

    try {
        const raw = fs.readFileSync(lockPath, "utf-8");
        return JSON.parse(raw) as LocalServerLockInfo;
    } catch {
        return null;
    }
}

export function writeLocalServerLock(info: LocalServerLockInfo): void {
    const dataDir = getLocalServerDataDir();
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(getLocalServerLockPath(), JSON.stringify(info, null, 2), "utf-8");
}

export function clearLocalServerLock(): void {
    const lockPath = getLocalServerLockPath();

    try {
        if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath);
        }
    } catch {
        // ignore
    }
}
