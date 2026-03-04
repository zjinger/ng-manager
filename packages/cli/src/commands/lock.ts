import {
    clearLocalServerLock,
    getLocalServerDataDir,
    getLocalServerLockPath,
    readLocalServerLock,
    writeLocalServerLock,
    type LocalServerLockInfo,
} from "@yinuo-ngm/core";

export type LockInfo = LocalServerLockInfo;

export function getDataDir(): string {
    return getLocalServerDataDir();
}

export function getLockPath(): string {
    return getLocalServerLockPath();
}

export function readLock(): LockInfo | null {
    return readLocalServerLock();
}

export function writeLock(info: LockInfo): void {
    writeLocalServerLock(info);
}

export function clearLock(): void {
    clearLocalServerLock();
}
