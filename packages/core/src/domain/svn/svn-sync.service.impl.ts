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
import { CoreEventMap, Events, IEventBus } from "../../infra/event";
import { SystemLogService } from "../logger";
import { SvnTaskManager } from "./svn-task.manager";
import { AppError } from "../../common/errors";
import { Project, ProjectAssetSourceSvn, ProjectService } from "../project";

const execFileAsync = promisify(execFile);

type StreamType = "stdout" | "stderr";

type RunStreamResult = {
    exitCode: number;         // 0 success, -1 spawn error
    stdoutTail: string;       // tail buffer
    stderrTail: string;
};


export class SvnSyncServiceImpl implements SvnSyncService {
    constructor(
        private runtimeRepo: SvnRuntimeRepo,
        private events: IEventBus<CoreEventMap>,
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

    /**
     * 实时流式版本的 sync，适用于需要实时展示日志的场景
     */
    async syncWithStream(projectId: string, sourceId: string, dir: string, url: string) {
        if (this.taskManager.isRunning(projectId, sourceId)) {
            throw new AppError("SVN_SYNC_ALREADY_RUNNING", `SVN sync is already running for project ${projectId}, source ${sourceId}`);
        }

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // 注册 task
        this.taskManager.register(projectId, sourceId, undefined);

        this.events.emit(Events.SVN_SYNC_STARTED, { projectId, sourceId, status: "running" });

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
            // r.stdout/r.stderr 是 tail（最后 5000）
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
            this.events.emit(Events.SVN_SYNC_PROGRESS, {
                projectId,
                sourceId,
                total: progress.total || 0,
                changed: progress.changed,
                percent: progress.total > 0 ? 100 : undefined,
                status: "success",
            });
            this.events.emit(Events.SVN_SYNC_DONE, {
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

            this.events.emit(Events.SVN_SYNC_FAILED, {
                projectId,
                sourceId,
                error: msg,
                updatedAt: now,
                status: "error",
            });

            // 同步失败也写 runtime（ lastSyncAt + error 摘要）
            this.runtimeRepo.update(projectId, sourceId, {
                lastSyncAt: now,
                lastStderr: (msg || "").slice(0, 5000),
            });
            throw new AppError("SVN_SYNC_FAILED", msg);
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
        // 先估算 total（如果有 working copy）
        progress.total = await this.estimateTotalByStatus(dir);

        // // 推一次初始进度
        // this.events.emit(Events.SVN_SYNC_PROGRESS, {
        //     projectId,
        //     sourceId,
        //     total: progress.total || 0,
        //     changed: 0,
        //     percent: progress.total > 0 ? 0 : undefined,
        //     status: "running",
        // });

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const desiredUrl = safeSvnPath(svnUrlRaw);
        const desiredNorm = normalizeSvnUrl(desiredUrl);

        const svnDir = path.join(dir, ".svn");
        const isCheckout = !fs.existsSync(svnDir);

        // helper: recheckout
        const doRecheckout = async (): Promise<SvnWorkingCopyStreamResult> => {
            // 安全删除：确保 dir 存在且是目录
            await fs.promises.rm(dir, { recursive: true, force: true });
            fs.mkdirSync(dir, { recursive: true });

            const r = await this.runSvnStreamOnce(projectId, sourceId, dir, ["checkout", desiredUrl, "."], progress);
            if (r.exitCode !== 0) {
                throw new AppError("SVN_SYNC_FAILED", `SVN checkout failed with exit code ${r.exitCode}. Stderr: ${r.stderrTail}`);
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

        // 1) 首次 checkout
        if (isCheckout) {
            const r = await this.runSvnStreamOnce(projectId, sourceId, dir, ["checkout", desiredUrl, "."], progress);
            if (r.exitCode !== 0) {
                throw new AppError("SVN_SYNC_FAILED", `SVN checkout failed with exit code ${r.exitCode}. Stderr: ${r.stderrTail}`);
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

        // 2) 已存在工作副本：先 info 当前 URL
        const currentUrl0 = safeSvnPath(await this.svnInfoUrl(dir));
        if (!currentUrl0) {
            // 工作副本损坏 / info 失败 → recheckout
            return doRecheckout();
        }

        const currentNorm0 = normalizeSvnUrl(currentUrl0);

        // 3) URL 变了 → switch (失败则 recheckout)
        if (currentNorm0 !== desiredNorm) {
            const sw = await this.runSvnStreamOnce(projectId, sourceId, dir, [
                "switch",
                desiredUrl,
                ".",
                "--ignore-ancestry",
            ], progress);

            if (sw.exitCode === 0) {
                // 可选：switch 后再 update 一次更稳（建议开启）
                const up = await this.runSvnStreamOnce(projectId, sourceId, dir, ["update"], progress);
                if (up.exitCode !== 0) {
                    throw new AppError("SVN_SYNC_FAILED", `SVN update after switch failed with exit code ${up.exitCode}. Stderr: ${up.stderrTail}`);
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

            // switch 失败 → recheckout
            return doRecheckout();
        }

        // 4) URL 没变 → update
        const up = await this.runSvnStreamOnce(projectId, sourceId, dir, ["update"], progress);
        // update 失败 → recheckout 
        if (up.exitCode !== 0) {
            throw new AppError("SVN_SYNC_FAILED", `SVN update failed with exit code ${up.exitCode}. Stderr: ${up.stderrTail}`);
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
        // 统计以 A/U/D/G/C/R/M 等开头的变更行
        // SVN 输出有时是 "A    file" 或 "U file"（多空格），用 \s+
        const lines = text.split(/\r?\n/);
        let n = 0;
        for (const line of lines) {
            const s = line.trimStart();
            if (!s) continue;
            // 常见的 action codes
            if (/^(A|U|D|G|C|R|M)\s+/.test(s)) n++;
        }
        return n;
    }

    private async estimateTotalByStatus(dir: string): Promise<number> {
        // 只有存在 .svn 时才尝试，否则直接未知
        if (!fs.existsSync(path.join(dir, ".svn"))) return 0;
        try {
            const { stdout } = await execFileAsync(
                this.svnBinary,
                ["status", "-u"],
                { cwd: dir, maxBuffer: 10 * 1024 * 1024 }
            );
            // status 输出也可能包含 action code 行
            // 例： "M       file" 或 "       * file"
            // 优先用 action code（A/U/D/M...），也允许 status 的第一列是字符
            const lines = stdout.split(/\r?\n/);
            let total = 0;
            for (const line of lines) {
                const s = line.trimStart();
                if (!s) continue;
                // status 的第一列一般是 [!~MADRC?] 或空格
                // 简单处理，只要开头是字母动作码就算一个条目
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

            this.events.emit(Events.SVN_SYNC_OUTPUT, {
                projectId,
                sourceId,
                type,
                data: chunk,
                status: "running",
            });
        };

        const child = spawn(this.svnBinary, args, { cwd });

        // 让 cancel 生效：更新 child 指针
        this.taskManager.setChild(projectId, sourceId, child);

        child.stdout.on("data", (d) => {
            const chunk = d.toString();
            push("stdout", chunk);
            // const delta = this.countChangedLines(chunk);
            // if (delta > 0) {
            //     progress.changed += delta;
            //     progress.changed = Math.min(progress.changed, progress.total);
            //     const payload: any = {
            //         projectId,
            //         sourceId,
            //         total: progress.total || 0,
            //         changed: progress.changed,
            //     };

            //     if (progress.total > 0) {
            //         // 运行中最多到 99，close 时再补 100
            //         payload.percent = Math.min(99, Math.floor((progress.changed / progress.total) * 100));
            //     }

            //     this.events.emit(Events.SVN_SYNC_PROGRESS, payload);
            // }

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
            child.once("error", () => done(-1)); // spawn 失败
        });

        return { exitCode, stdoutTail, stderrTail };
    }
}