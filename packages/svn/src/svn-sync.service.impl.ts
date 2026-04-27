import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import {
    safeSvnPath,
    normalizeSvnUrl,
} from "./svn.util";
import type {
    SvnWorkingCopyResult,
    SvnSyncResult,
    SvnRuntime,
    ProgressState,
    SvnWorkingCopyStreamResult,
} from "./svn.types";
import { SvnRuntimeRepo } from "./svn-runtime.repo";
import { SvnSyncService } from "./svn-sync.service";
import { SvnEvents, type SvnEventMap } from "./svn.events";
import type { SystemLogService } from "@yinuo-ngm/logger";
import { SvnTaskManager } from "./svn-task.manager";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { Project, ProjectAssetSourceSvn, type ProjectService } from "@yinuo-ngm/project";
import type { IEventBus } from "@yinuo-ngm/event";

const execFileAsync = promisify(execFile);

type StreamType = "stdout" | "stderr";

type RunStreamResult = {
    exitCode: number;
    stdoutTail: string;
    stderrTail: string;
};

export class SvnSyncServiceImpl implements SvnSyncService {
    constructor(
        private runtimeRepo: SvnRuntimeRepo,
        private events: IEventBus<SvnEventMap>,
        private sysLog: SystemLogService,
        private taskManager: SvnTaskManager,
        private project: ProjectService,
        private svnBinary: string = "svn"
    ) { }

    private async svnInfoUrl(dir: string): Promise<string> {
        try {
            const { stdout } = await execFileAsync(
                this.svnBinary,
                ["info", "--show-item", "url"],
                { cwd: dir }
            );
            return stdout.trim();
        } catch {
            return "";
        }
    }

    private async checkoutOrUpdate(
        dir: string,
        svnUrlRaw: string
    ): Promise<SvnWorkingCopyResult> {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const desiredUrl = safeSvnPath(svnUrlRaw);
        const desiredNorm = normalizeSvnUrl(desiredUrl);

        const svnDir = path.join(dir, ".svn");
        const isCheckout = !fs.existsSync(svnDir);

        if (isCheckout) {
            const { stdout, stderr } = await execFileAsync(
                this.svnBinary,
                ["checkout", desiredUrl, "."],
                { cwd: dir }
            );
            const currentUrl = await this.svnInfoUrl(dir);
            return {
                mode: "checkout",
                stdout,
                stderr,
                desiredUrl,
                currentUrl,
            };
        }

        const currentUrl0 = await this.svnInfoUrl(dir);
        if (!currentUrl0) {
            await fs.promises.rm(dir, { recursive: true, force: true });
            fs.mkdirSync(dir, { recursive: true });

            const { stdout, stderr } = await execFileAsync(
                this.svnBinary,
                ["checkout", desiredUrl, "."],
                { cwd: dir }
            );
            const currentUrl = await this.svnInfoUrl(dir);
            return {
                mode: "recheckout",
                stdout,
                stderr,
                desiredUrl,
                currentUrl,
            };
        }

        const currentNorm = normalizeSvnUrl(currentUrl0);

        if (currentNorm !== desiredNorm) {
            try {
                const { stdout, stderr } = await execFileAsync(
                    this.svnBinary,
                    ["switch", desiredUrl, ".", "--ignore-ancestry"],
                    { cwd: dir }
                );
                const currentUrl = await this.svnInfoUrl(dir);
                return {
                    mode: "switch",
                    stdout,
                    stderr,
                    desiredUrl,
                    currentUrl,
                };
            } catch {
                await fs.promises.rm(dir, { recursive: true, force: true });
                fs.mkdirSync(dir, { recursive: true });

                const { stdout, stderr } = await execFileAsync(
                    this.svnBinary,
                    ["checkout", desiredUrl, "."],
                    { cwd: dir }
                );
                const currentUrl = await this.svnInfoUrl(dir);
                return {
                    mode: "recheckout",
                    stdout,
                    stderr,
                    desiredUrl,
                    currentUrl,
                };
            }
        }

        const { stdout, stderr } = await execFileAsync(
            this.svnBinary,
            ["update"],
            { cwd: dir }
        );

        const currentUrl = await this.svnInfoUrl(dir);
        return {
            mode: "update",
            stdout,
            stderr,
            desiredUrl,
            currentUrl,
        };
    }

    async sync(
        projectId: string,
        sourceId: string,
        dir: string,
        url: string
    ): Promise<SvnSyncResult> {
        const r = await this.checkoutOrUpdate(dir, url);
        const now = new Date().toISOString();
        this.runtimeRepo.update(projectId, sourceId, {
            lastSyncAt: now,
            lastSyncMode: r.mode,
            desiredUrl: r.desiredUrl,
            currentUrl: r.currentUrl,
            lastStdout: r.stdout?.slice(0, 5000),
            lastStderr: r.stderr?.slice(0, 5000),
        });
        return {
            ok: true,
            projectId,
            sourceId,
            mode: r.mode,
            updatedAt: now,
            desiredUrl: r.desiredUrl,
            currentUrl: r.currentUrl,
            stdout: r.stdout,
            stderr: r.stderr,
        };
    }

    async syncWithStream(projectId: string, sourceId: string, dir: string, url: string) {
        if (this.taskManager.isRunning(projectId, sourceId)) {
            throw new CoreError(CoreErrorCodes.SVN_SYNC_ALREADY_RUNNING, `SVN sync is already running for project ${projectId}, source ${sourceId}`);
        }

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        this.taskManager.register(projectId, sourceId, undefined);

        this.events.emit(SvnEvents.SYNC_STARTED, { projectId, sourceId, status: "running" });

        const desiredUrl = safeSvnPath(url);
        this.sysLog.info({
            source: "system",
            scope: "svn",
            refId: `${projectId}:${sourceId}`,
            text: `SVN Sync started for url=${desiredUrl}`,
        });
        const now = new Date().toISOString();
        try {
            const r = await this.checkoutOrUpdateStream(projectId, sourceId, dir, url);
            this.runtimeRepo.update(projectId, sourceId, {
                lastSyncAt: now,
                lastSyncMode: r.mode,
                desiredUrl: r.desiredUrl,
                currentUrl: r.currentUrl,
                lastStdout: r.stdout?.slice(0, 5000),
                lastStderr: r.stderr?.slice(0, 5000),
            });

            this.sysLog.success({
                source: "system",
                scope: "svn",
                refId: `${projectId}:${sourceId}`,
                text: `SVN Sync done mode=${r.mode}`,
            });
            const progress = r.progress || { total: 0, changed: 0 };
            this.events.emit(SvnEvents.SYNC_PROGRESS, {
                projectId,
                sourceId,
                total: progress.total || 0,
                changed: progress.changed,
                percent: progress.total > 0 ? 100 : undefined,
                status: "success",
            });
            this.events.emit(SvnEvents.SYNC_DONE, {
                projectId,
                sourceId,
                mode: r.mode,
                desiredUrl: r.desiredUrl,
                currentUrl: r.currentUrl,
                updatedAt: now,
                status: "success",
            });

        } catch (e: any) {
            const msg = e?.message || "SVN Sync failed";
            this.sysLog.error({
                source: "system",
                scope: "svn",
                refId: `${projectId}:${sourceId}`,
                text: msg,
            });

            this.events.emit(SvnEvents.SYNC_FAILED, {
                projectId,
                sourceId,
                error: msg,
                updatedAt: now,
                status: "error",
            });

            this.runtimeRepo.update(projectId, sourceId, {
                lastSyncAt: now,
                lastStderr: (msg || "").slice(0, 5000),
            });
            throw new CoreError(CoreErrorCodes.SVN_SYNC_FAILED, msg);
        } finally {
            this.taskManager.finish(projectId, sourceId);
        }
    }

    async getRuntimeByProjectId(projectId: string, tail?: number): Promise<SvnRuntime[]> {
        const p: Project = await this.project.get(projectId);
        if (!p || !p.assets) return [];
        const { iconsSvn, cutImageSvn } = p.assets;
        const svnSources = [iconsSvn, cutImageSvn].filter(s => s && s.kind === "svn") as ProjectAssetSourceSvn[];
        const runtimes = svnSources.map(s => {
            const r = this.runtimeRepo.get(projectId, s.id);
            if (tail) {
                return {
                    projectId,
                    sourceId: s.id,
                    lastSyncAt: r?.lastSyncAt,
                    lastSyncMode: r?.lastSyncMode,
                    desiredUrl: r?.desiredUrl,
                    currentUrl: r?.currentUrl,
                    lastStdout: r?.lastStdout?.slice(-tail),
                    lastStderr: r?.lastStderr?.slice(-tail),
                } as SvnRuntime;
            }
            return {
                projectId,
                sourceId: s.id,
                lastSyncAt: r?.lastSyncAt,
                lastSyncMode: r?.lastSyncMode,
                desiredUrl: r?.desiredUrl,
                currentUrl: r?.currentUrl,
            } as SvnRuntime;
        });
        return runtimes;
    }

    private async checkoutOrUpdateStream(
        projectId: string,
        sourceId: string,
        dir: string,
        svnUrlRaw: string,
    ): Promise<SvnWorkingCopyStreamResult> {
        const progress: ProgressState = { total: 0, changed: 0 };
        progress.total = await this.estimateTotalByStatus(dir);

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const desiredUrl = safeSvnPath(svnUrlRaw);
        const desiredNorm = normalizeSvnUrl(desiredUrl);

        const svnDir = path.join(dir, ".svn");
        const isCheckout = !fs.existsSync(svnDir);

        const doRecheckout = async (): Promise<SvnWorkingCopyStreamResult> => {
            await fs.promises.rm(dir, { recursive: true, force: true });
            fs.mkdirSync(dir, { recursive: true });

            const r = await this.runSvnStreamOnce(projectId, sourceId, dir, ["checkout", desiredUrl, "."], progress);
            if (r.exitCode !== 0) {
                throw new CoreError(CoreErrorCodes.SVN_SYNC_FAILED, `SVN checkout failed with exit code ${r.exitCode}. Stderr: ${r.stderrTail}`);
            }

            const currentUrl = safeSvnPath(await this.svnInfoUrl(dir));
            return {
                mode: "recheckout",
                stdout: r.stdoutTail,
                stderr: r.stderrTail,
                desiredUrl,
                currentUrl,
                progress
            };
        };

        if (isCheckout) {
            const r = await this.runSvnStreamOnce(projectId, sourceId, dir, ["checkout", desiredUrl, "."], progress);
            if (r.exitCode !== 0) {
                throw new CoreError(CoreErrorCodes.SVN_SYNC_FAILED, `SVN checkout failed with exit code ${r.exitCode}. Stderr: ${r.stderrTail}`);
            }
            const currentUrl = safeSvnPath(await this.svnInfoUrl(dir));
            return {
                mode: "checkout",
                stdout: r.stdoutTail,
                stderr: r.stderrTail,
                desiredUrl,
                currentUrl,
                progress
            };
        }

        const currentUrl0 = safeSvnPath(await this.svnInfoUrl(dir));
        if (!currentUrl0) {
            return doRecheckout();
        }

        const currentNorm0 = normalizeSvnUrl(currentUrl0);

        if (currentNorm0 !== desiredNorm) {
            const sw = await this.runSvnStreamOnce(projectId, sourceId, dir, [
                "switch",
                desiredUrl,
                ".",
                "--ignore-ancestry",
            ], progress);

            if (sw.exitCode === 0) {
                const up = await this.runSvnStreamOnce(projectId, sourceId, dir, ["update"], progress);
                if (up.exitCode !== 0) {
                    throw new CoreError(CoreErrorCodes.SVN_SYNC_FAILED, `SVN update after switch failed with exit code ${up.exitCode}. Stderr: ${up.stderrTail}`);
                }

                const currentUrl = safeSvnPath(await this.svnInfoUrl(dir));
                return {
                    mode: "switch",
                    stdout: (sw.stdoutTail + "\n" + up.stdoutTail).slice(-5000),
                    stderr: (sw.stderrTail + "\n" + up.stderrTail).slice(-5000),
                    desiredUrl,
                    currentUrl,
                    progress
                };
            }

            return doRecheckout();
        }

        const up = await this.runSvnStreamOnce(projectId, sourceId, dir, ["update"], progress);
        if (up.exitCode !== 0) {
            throw new CoreError(CoreErrorCodes.SVN_SYNC_FAILED, `SVN update failed with exit code ${up.exitCode}. Stderr: ${up.stderrTail}`);
        }
        const currentUrl = safeSvnPath(await this.svnInfoUrl(dir));
        return {
            mode: "update",
            stdout: up.stdoutTail,
            stderr: up.stderrTail,
            desiredUrl,
            currentUrl,
            progress
        };
    }

    private countChangedLines(text: string): number {
        const lines = text.split(/\r?\n/);
        let n = 0;
        for (const line of lines) {
            const s = line.trimStart();
            if (!s) continue;
            if (/^(A|U|D|G|C|R|M)\s+/.test(s)) n++;
        }
        return n;
    }

    private async estimateTotalByStatus(dir: string): Promise<number> {
        if (!fs.existsSync(path.join(dir, ".svn"))) return 0;
        try {
            const { stdout } = await execFileAsync(
                this.svnBinary,
                ["status", "-u"],
                { cwd: dir, maxBuffer: 10 * 1024 * 1024 }
            );
            const lines = stdout.split(/\r?\n/);
            let total = 0;
            for (const line of lines) {
                const s = line.trimStart();
                if (!s) continue;
                if (/^(A|U|D|G|C|R|M|\!|\~|\?|\+)\s+/.test(s)) total++;
            }
            return total;
        } catch {
            return 0;
        }
    }

    private async runSvnStreamOnce(
        projectId: string,
        sourceId: string,
        cwd: string,
        args: string[],
        progress: ProgressState,
    ): Promise<RunStreamResult> {
        let stdoutTail = "";
        let stderrTail = "";

        const push = (type: StreamType, chunk: string) => {
            if (type === "stdout") stdoutTail = (stdoutTail + chunk).slice(-5000);
            else stderrTail = (stderrTail + chunk).slice(-5000);

            this.events.emit(SvnEvents.SYNC_OUTPUT, {
                projectId,
                sourceId,
                type,
                data: chunk,
                status: "running",
            });
        };

        const child = spawn(this.svnBinary, args, { cwd });

        this.taskManager.setChild(projectId, sourceId, child);

        child.stdout.on("data", (d) => {
            const chunk = d.toString();
            push("stdout", chunk);
        });
        child.stderr.on("data", (d) => push("stderr", d.toString()));

        const exitCode: number = await new Promise((resolve) => {
            let settled = false;
            const done = (code: number) => {
                if (settled) return;
                settled = true;
                resolve(code);
            };

            child.once("close", (code) => done(typeof code === "number" ? code : -1));
            child.once("error", () => done(-1));
        });

        return { exitCode, stdoutTail, stderrTail };
    }
}
