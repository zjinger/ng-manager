import type { SvnSyncMode } from "../ws.svn.types";

export interface ProgressStateDto {
    total: number;
    changed: number;
}

export interface SvnSyncResultDto {
    ok: boolean;
    projectId: string;
    sourceId: string;
    mode: SvnSyncMode;
    updatedAt: string;
    desiredUrl: string;
    currentUrl: string;
    stdout?: string;
    stderr?: string;
}

export interface SvnRuntimeDto {
    projectId: string;
    sourceId: string;
    lastSyncAt?: string;
    lastSyncMode?: SvnSyncMode;
    desiredUrl?: string;
    currentUrl?: string;
    lastStdout?: string;
    lastStderr?: string;
}