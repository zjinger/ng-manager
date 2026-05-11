import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';
import { uid } from '@yinuo-ngm/shared';
import type { IEventBus } from '@yinuo-ngm/event';
import type { ProcHandle, SpawnedProcess } from '@yinuo-ngm/process';
import type { LogStreamType, SystemLogLevel, TaskOutputPayload } from '@yinuo-ngm/protocol';
import type { ProcessService } from '@yinuo-ngm/process';
import type { ProjectService } from '@yinuo-ngm/project';
import type { NodeVersionService } from '@yinuo-ngm/node-version';
import { genSpecsFromScripts } from './infra/generators/genSpecsFromScripts';
import { TaskAnalyzerService } from './analyzer/task-analyzer.service';
import { detectProjectBuild } from './analyzer/project-build-detector';
import { normalizeTaskOutput, parseTaskOutput } from './runtime/task-output-parser';
import type { TaskService } from './task.service';
import type { TaskDashboard, TaskDefinition, TaskRow, TaskRuntime } from './task.types';
import { TaskEvents, type TaskEventMap } from './infra/task-event-map';
import type { ILogStore, SystemLogService } from '@yinuo-ngm/logger';

function bufToText(b: Buffer) {
    return b.toString("utf8");
}

export class TaskServiceImpl implements TaskService {
    private specs = new Map<string, TaskDefinition>();
    private activeRunByTaskId = new Map<string, string>();
    private runtimes = new Map<string, TaskRuntime>();
    private procs = new Map<string, ProcHandle>();
    private runIdsByTaskId = new Map<string, string[]>();
    private outputTailByRunId = new Map<string, string>();
    private analyzerService: TaskAnalyzerService;
    private readonly MAX_RUNS_PER_TASK = 5;
    private readonly MAX_TOTAL_RUNS = 200;

    constructor(
        private projectService: ProjectService,
        private proc: ProcessService,
        private sysLog: SystemLogService,
        private taskStreamLog: ILogStore,
        private events: IEventBus<TaskEventMap>,
        private nodeVersionService: NodeVersionService,
        analyzerService?: TaskAnalyzerService
    ) {
        this.analyzerService = analyzerService ?? new TaskAnalyzerService();
    }

    async start(taskId: string): Promise<TaskRuntime> {
        const spec = this.specs.get(taskId);
        if (!spec?.command) {
            throw new CoreError(CoreErrorCodes.TASK_SPEC_NOT_FOUND, "Task spec not found or not runnable", { taskId });
        }
        const active = this.activeRunByTaskId.get(taskId);
        if (active) {
            const rt = this.runtimes.get(active);
            if (rt?.status === "running" || rt?.status === "stopping") {
                throw new CoreError(CoreErrorCodes.TASK_ALREADY_RUNNING, "Task already running", { taskId, runId: active });
            }
            this.activeRunByTaskId.delete(taskId);
        }

        const runId = `run:${uid()}`;
        const rt: TaskRuntime = {
            taskId,
            projectId: spec.projectId,
            name: spec.name,
            runId,
            status: "running",
            startedAt: Date.now(),
        };

        this.activeRunByTaskId.set(taskId, runId);
        this.runtimes.set(runId, rt);
        this.trackRun(taskId, runId);

        const launchSpec = await this.prepareLaunchSpec(spec, runId);
        const cmdStr = `${launchSpec.command}${(launchSpec.args?.length ? " " + launchSpec.args.join(" ") : "")}`;
        const text = `[Task] ${spec.projectRoot}: ${cmdStr} started`;
        this.appendSysLog(runId, text, 'info');

        let targetVersion: string | null = null;
        if (spec.projectRoot) {
            try {
                const requirement = await this.nodeVersionService.detectProjectRequirement(spec.projectRoot);
                if (requirement.voltaConfig) {
                    this.appendSysLog(runId, `[Node] 项目配置了 Volta (node@${requirement.voltaConfig})，由 Volta 自动切换`, 'info');
                    const manager = this.nodeVersionService.getManager();
                    if (manager === 'volta' || manager === 'nvm+volta') {
                        try {
                            await this.nodeVersionService.switchVersion(`node@${requirement.voltaConfig}`, runId);
                        } catch (e: any) {
                            this.appendSysLog(runId, `[Node] Volta 配置失败: ${e?.message ?? String(e)}，继续运行`, 'warn');
                        }
                    } else {
                        this.appendSysLog(runId, `[Node] 未安装 Volta，无法使用项目配置的 Volta 版本`, 'warn');
                    }
                } else if (requirement.requiredVersion) {
                    if (!requirement.isMatch && requirement.satisfiedBy) {
                        targetVersion = requirement.satisfiedBy;
                        this.appendSysLog(runId, `[Node] 全局切换到 Node ${targetVersion}（项目要求 ${requirement.requiredVersion}）`, 'info');
                    } else if (requirement.isMatch) {
                        this.appendSysLog(runId, `[Node] 当前版本 ${requirement.satisfiedBy} 已满足要求 ${requirement.requiredVersion}`, 'info');
                    } else {
                        this.appendSysLog(runId, `[Node] 警告: 项目要求 ${requirement.requiredVersion}，未找到匹配的已安装版本`, 'warn');
                    }
                }
            } catch (e: any) {
                this.appendSysLog(runId, `[Node] 检测版本要求失败: ${e?.message ?? String(e)}`, 'warn');
            }
        }

        let p: SpawnedProcess;
        try {
            if (targetVersion) {
                try {
                    await this.nodeVersionService.switchVersion(targetVersion, runId);
                } catch (e: any) {
                    this.appendSysLog(runId, `[Node] 切换版本失败: ${e?.message ?? String(e)}，继续运行`, 'warn');
                }
            }

            p = await this.proc.spawn(launchSpec.command!, launchSpec.args ?? [], {
                cwd: launchSpec.cwd!,
                env: launchSpec.env,
                shell: launchSpec.shell ?? false,
                cols: 140,
                rows: 40,
            });
        } catch (e: CoreError | any) {
            const cur = this.runtimes.get(runId);
            if (cur) {
                cur.status = "failed";
                cur.stoppedAt = Date.now();
                cur.exitCode = null;
                cur.signal = null;
                this.runtimes.set(runId, cur);
            }
            this.activeRunByTaskId.delete(taskId);
            this.appendSysLog(runId, `[Task] ${spec.projectRoot}: spawn failed, ${e?.message ?? String(e)}`, 'error', { taskId, runId });
            this.appendTaskOutput(runId, taskId, `[Task] spawn failed: ${e?.message ?? String(e)}`, "stderr");

            this.events.emit(TaskEvents.TASK_FAILED, {
                taskId,
                runId,
                error: e?.message ?? String(e),
            });

            throw e;
        }

        rt.pid = p.pid;
        this.runtimes.set(runId, rt);
        const resizeFn = typeof p.resize === "function" ? p.resize : undefined;
        const interruptFn = typeof p.interrupt === "function" ? p.interrupt : undefined;
        this.procs.set(runId, {
            pid: p.pid,
            interrupt: interruptFn ? () => interruptFn() : undefined,
            kill: (sig?: NodeJS.Signals) => {
                try {
                    p.kill(sig);
                } catch { }
            },
            resize: resizeFn ? (c, r) => resizeFn(c, r) : undefined,
        });

        this.events.emit(TaskEvents.TASK_STARTED, { taskId, runId, pid: p.pid, startedAt: rt.startedAt!, projectId: spec.projectId });

        if (typeof p.onData === "function") {
            p.onData((data: string) => {
                const text = typeof data === "string" ? data : String(data ?? "");
                this.appendTaskOutput(runId, taskId, text);
            });
        } else {
            p.onStdout?.((chunk: Buffer) => {
                const text = bufToText(chunk);
                this.appendTaskOutput(runId, taskId, text);
            });
            p.onStderr?.((chunk: Buffer) => {
                const text = bufToText(chunk);
                this.appendTaskOutput(runId, taskId, text, "stderr");
            });
        }

        p.onExit((code: number | null, signal: string | null) => {
            const cur = this.runtimes.get(runId);
            if (!cur) return;
            cur.exitCode = code;
            cur.signal = signal;
            cur.stoppedAt = Date.now();
            if (cur.status === "stopping") {
                cur.status = "stopped";
            } else if (signal) {
                cur.status = "stopped";
            } else if (code === 0) {
                cur.status = "success";
            } else {
                cur.status = "failed";
            }
            this.runtimes.set(runId, cur);
            this.procs.delete(runId);
            const active2 = this.activeRunByTaskId.get(taskId);
            if (active2 === runId) this.activeRunByTaskId.delete(taskId);
            const stream = cur.status === "failed" ? "stderr" : "stdout";
            const sysLevel = cur.status === "failed" ? "error" : "info";
            const sysText = `[Task] ${spec.projectRoot}: ${cmdStr} ${cur.status}`;
            this.appendSysLog(runId, sysText, sysLevel);
            const taskOutputText = `[Task] exited: status=${cur.status} code=${code} signal=${signal}`;
            this.appendTaskOutput(runId, taskId, taskOutputText, stream);

            this.events.emit(TaskEvents.TASK_EXITED, { taskId, runId, exitCode: code, signal, stoppedAt: cur.stoppedAt! });
            if (cur.status === "failed") {
                this.events.emit(TaskEvents.TASK_FAILED, { taskId, runId, error: `[Task] exit code=${code}` });
            }
            if (cur.status === "success" && spec.kind === "build") {
                this.analyzeAfterExit(spec, cur).catch((e) => {
                    this.appendSysLog(runId, `[Task Analyze] failed: ${e?.message ?? String(e)}`, "warn");
                });
            }
            this.pruneRunsForTask(taskId);
            this.pruneRunsGlobal();
        });

        return rt;
    }

    async stop(taskId: string): Promise<TaskRuntime> {
        const cur = this.getActiveRuntime(taskId);
        if (!cur) throw new CoreError(CoreErrorCodes.RUN_NOT_FOUND, "Run not found", { taskId });
        const { runId, rt } = cur;

        if (rt.status !== "running") return rt;
        rt.status = "stopping";
        this.runtimes.set(runId, rt);

        this.events.emit(TaskEvents.TASK_STOP_REQUESTED, { taskId: rt.taskId, runId });
        this.stopReliable(runId).catch(() => { });
        return rt;
    }

    async restart(taskId: string): Promise<TaskRuntime> {
        const cur = this.getActiveRuntime(taskId);
        if (!cur) throw new CoreError(CoreErrorCodes.RUN_NOT_FOUND, "Run not found", { taskId });
        const { runId, rt } = cur;

        if (rt.status !== "running") {
            return await this.start(taskId);
        }

        rt.status = "stopping";
        this.runtimes.set(runId, rt);
        this.events.emit(TaskEvents.TASK_STOP_REQUESTED, { taskId: rt.taskId, runId });

        await this.stopReliable(runId);
        return await this.start(taskId);
    }

    async status(taskId: string): Promise<TaskRuntime> {
        const cur = this.getActiveRuntime(taskId);
        if (!cur) throw new CoreError(CoreErrorCodes.RUN_NOT_FOUND, `Run not found for task: ${taskId}`, { taskId });
        return cur.rt;
    }

    async listActive(): Promise<TaskRuntime[]> {
        const out: TaskRuntime[] = [];
        for (const rt of this.runtimes.values()) {
            if (rt.status === "running" || rt.status === "stopping") {
                out.push(rt);
            }
        }
        out.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
        return out;
    }

    async refreshByProject(projectId: string, opts: { pruneOrphan?: "none" | "safe" | "all" } = {}): Promise<TaskRow[]> {
        const project = await this.projectService.get(projectId);
        const rootDir = project.root;
        const scripts = project.scripts ?? {};
        const pm = project.packageManager ?? "npm";
        const projectName = project.name;

        const nextSpecs = genSpecsFromScripts(projectId, rootDir, projectName, scripts, pm);

        const prevTaskIds = new Set<string>();
        for (const [id, s] of this.specs.entries()) {
            if (s.projectId === projectId) prevTaskIds.add(id);
        }

        for (const id of prevTaskIds) this.specs.delete(id);
        for (const s of nextSpecs) this.specs.set(s.id, s);

        const mode = opts.pruneOrphan ?? "none";
        if (mode !== "none") {
            const nextTaskIds = new Set(nextSpecs.map((s) => s.id));
            const orphanTaskIds = [...prevTaskIds].filter((id) => !nextTaskIds.has(id));
            if (mode === "safe") {
                this.pruneOrphanSafe(orphanTaskIds);
            } else if (mode === "all") {
                this.pruneOrphanAll(orphanTaskIds);
            }
        }
        this.events.emit(TaskEvents.TASK_SPECS_REFRESHED, { projectId, count: nextSpecs.length });
        return await this.listViewsByProject(projectId);
    }

    async listViewsByProject(projectId: string): Promise<TaskRow[]> {
        const specs = await this.listSpecsByProject(projectId);
        return specs.map((spec) => {
            let runtime: TaskRuntime | undefined;
            const activeRunId = this.activeRunByTaskId.get(spec.id);
            if (activeRunId) {
                const rt = this.runtimes.get(activeRunId);
                if (rt) {
                    runtime = rt;
                } else {
                    this.activeRunByTaskId.delete(spec.id);
                }
            }
            if (!runtime) {
                const arr = this.runIdsByTaskId.get(spec.id);
                if (arr && arr.length > 0) {
                    for (let i = arr.length - 1; i >= 0; i--) {
                        const runId = arr[i]!;
                        const rt = this.runtimes.get(runId);
                        if (rt) {
                            runtime = rt;
                            break;
                        }
                        arr.splice(i, 1);
                    }
                    if (arr.length === 0) this.runIdsByTaskId.delete(spec.id);
                    else this.runIdsByTaskId.set(spec.id, arr);
                }
            }
            return { spec, runtime };
        });
    }

    async listSpecsByProject(projectId: string): Promise<TaskDefinition[]> {
        return Array.from(this.specs.values()).filter((s) => s.projectId === projectId);
    }

    async getSnapshot(runId: string): Promise<TaskRuntime | null> {
        return this.runtimes.get(runId) ?? null;
    }

    async getSnapshotByTaskId(taskId: string): Promise<TaskRuntime | null> {
        const active = this.activeRunByTaskId.get(taskId);
        if (active) {
            const rt = this.runtimes.get(active);
            if (rt) return rt;
            this.activeRunByTaskId.delete(taskId);
        }
        const arr = this.runIdsByTaskId.get(taskId);
        if (!arr || arr.length === 0) return null;
        for (let i = arr.length - 1; i >= 0; i--) {
            const runId = arr[i]!;
            const rt = this.runtimes.get(runId);
            if (rt) return rt;
            arr.splice(i, 1);
        }
        if (arr.length === 0) this.runIdsByTaskId.delete(taskId);
        else this.runIdsByTaskId.set(taskId, arr);
        return null;
    }

    async getReportByRunId(runId: string) {
        return this.analyzerService.getReportByRunId(runId);
    }

    async getLatestReportByTaskId(taskId: string) {
        return this.analyzerService.getLatestReportByTaskId(taskId);
    }

    async getDashboardByTaskId(taskId: string): Promise<TaskDashboard | null> {
        const spec = this.specs.get(taskId);
        const runtime = await this.getSnapshotByTaskId(taskId);
        const report = this.analyzerService.getLatestReportByTaskId(taskId);
        const projectId = runtime?.projectId ?? spec?.projectId;
        if (!projectId) return null;

        const durationMs = runtime?.startedAt
            ? Math.max(0, (runtime.stoppedAt ?? Date.now()) - runtime.startedAt)
            : report?.summary.durationMs;

        return {
            taskId,
            projectId,
            runId: runtime?.runId ?? report?.runId,
            status: runtime?.status ?? "idle",
            progress: {
                startedAt: runtime?.startedAt,
                stoppedAt: runtime?.stoppedAt,
                durationMs,
                readyAt: runtime?.readyAt,
                rebuildDurationMs: runtime?.rebuildDurationMs,
            },
            sizes: report
                ? {
                    outputPath: report.summary.outputPath,
                    fileCount: report.summary.fileCount,
                    totalRawSize: report.summary.totalRawSize,
                    totalGzipSize: report.summary.totalGzipSize,
                    jsRawSize: report.summary.jsRawSize,
                    cssRawSize: report.summary.cssRawSize,
                    assetRawSize: report.summary.assetRawSize,
                }
                : undefined,
            problems: {
                warningsCount: runtime?.warningsCount ?? 0,
                errorsCount: runtime?.errorsCount ?? 0,
                lastError: runtime?.lastError,
            },
            urls: runtime?.urls ?? [],
        };
    }

    async getTailLogsByRun(runId: string, tail: number) {
        return this.taskStreamLog.tail(Math.min(tail, 1000), { refId: runId, source: "task" });
    }

    async getSyslogTail(tail: number) {
        return this.sysLog.tail(Math.min(tail, 2000), { source: "system" });
    }

    resizeRun(taskId: string, cols: number, rows: number) {
        const cur = this.getActiveRuntime(taskId);
        if (!cur) return;
        const h = this.procs.get(cur.runId);
        if (!h?.resize) return;
        h.resize(cols, rows);
    }

    registerSpec(spec: TaskDefinition): void {
        this.specs.set(spec.id, spec);
    }

    private async prepareLaunchSpec(spec: TaskDefinition, runId: string): Promise<TaskDefinition> {
        if (spec.kind !== "build" || !spec.command || !spec.projectRoot) return spec;

        let detection: Awaited<ReturnType<typeof detectProjectBuild>>;
        try {
            detection = await detectProjectBuild(spec.projectRoot);
        } catch (e: any) {
            this.appendSysLog(runId, `[Task Analyze] 项目构建类型检测失败: ${e?.message ?? String(e)}`, "warn");
            return spec;
        }

        if (detection.framework !== "angular") {
            if (detection.buildTool === "vite") {
                this.appendSysLog(runId, "[Task Analyze] Vite/Rollup 项目将优先读取 rollup-plugin-visualizer 生成的 stats.html / stats.json", "info");
            } else if (detection.buildTool === "webpack" || detection.buildTool === "vue-cli-webpack") {
                this.appendSysLog(runId, "[Task Analyze] webpack 项目将优先读取 webpack stats.json，可用 webpack-bundle-analyzer 生成/查看同一份 stats", "info");
            }
            return spec;
        }

        const current = `${spec.command} ${(spec.args ?? []).join(" ")}`.trim();
        if (/\b--stats-json\b/.test(current)) return spec;

        const command = this.appendStatsJsonArg(spec.command);
        if (command === spec.command) return spec;

        this.appendSysLog(runId, "[Task Analyze] 检测到 Angular 构建任务，将优先尝试读取 stats.json；如未生成或无法解析，将回退到 dist 产物扫描。", "info");
        return {
            ...spec,
            command,
        };
    }

    private appendStatsJsonArg(command: string): string {
        const trimmed = command.trim();
        if (/\b(?:npm|pnpm)(?:\.cmd)?\s+run\s+\S+/.test(trimmed)) return `${trimmed} -- --stats-json`;
        if (/\byarn(?:\.cmd)?\s+\S+/.test(trimmed)) return `${trimmed} --stats-json`;
        if (/\bng(?:\.cmd)?\s+build\b/.test(trimmed)) return `${trimmed} --stats-json`;
        return trimmed;
    }

    private sleep(ms: number) {
        return new Promise<void>((r) => setTimeout(r, ms));
    }

    private async stopReliable(runId: string, softTimeoutMs = 1800) {
        const handle = this.procs.get(runId);
        if (!handle) return;

        if (handle.interrupt) {
            try {
                handle.interrupt();
            } catch { }
        } else {
            try {
                handle.kill("SIGTERM");
            } catch { }
        }

        const t0 = Date.now();
        while (Date.now() - t0 < softTimeoutMs) {
            if (!this.procs.has(runId)) return;
            await this.sleep(80);
        }

        const handle2 = this.procs.get(runId);
        if (!handle2) return;

        try {
            handle2.kill("SIGKILL");
        } catch {
            try {
                handle2.kill();
            } catch { }
        }

        const t1 = Date.now();
        while (Date.now() - t1 < 1000) {
            if (!this.procs.has(runId)) return;
            await this.sleep(80);
        }
    }

    private getActiveRuntime(taskId: string): { runId: string; rt: TaskRuntime } | null {
        const runId = this.activeRunByTaskId.get(taskId);
        if (!runId) return null;
        const rt = this.runtimes.get(runId);
        if (!rt) return null;
        return { runId, rt };
    }

    private trackRun(taskId: string, runId: string) {
        const arr = this.runIdsByTaskId.get(taskId) ?? [];
        arr.push(runId);
        this.runIdsByTaskId.set(taskId, arr);
        this.pruneRunsForTask(taskId);
        this.pruneRunsGlobal();
    }

    private canPruneRun(taskId: string, runId: string) {
        const active = this.activeRunByTaskId.get(taskId);
        if (active === runId) return false;
        if (this.procs.has(runId)) return false;
        return true;
    }

    private pruneRunsForTask(taskId: string) {
        const arr = this.runIdsByTaskId.get(taskId);
        if (!arr || arr.length <= this.MAX_RUNS_PER_TASK) return;

        let removed = 0;
        while (arr.length > this.MAX_RUNS_PER_TASK) {
            const oldest = arr[0]!;
            if (!this.canPruneRun(taskId, oldest)) break;
            arr.shift();
            this.runtimes.delete(oldest);
            this.procs.delete(oldest);
            removed++;
        }

        if (removed > 0) {
            this.runIdsByTaskId.set(taskId, arr);
        }
    }

    private pruneRunsGlobal() {
        const total = this.runtimes.size;
        if (total <= this.MAX_TOTAL_RUNS) return;

        const queue: Array<{ taskId: string; runId: string }> = [];
        for (const [taskId, runIds] of this.runIdsByTaskId.entries()) {
            for (const runId of runIds) queue.push({ taskId, runId });
        }

        if (queue.length === 0) return;

        let target = total - this.MAX_TOTAL_RUNS;
        for (const item of queue) {
            if (target <= 0) break;
            const { taskId, runId } = item;

            if (!this.runtimes.has(runId)) continue;
            if (!this.canPruneRun(taskId, runId)) continue;

            const arr = this.runIdsByTaskId.get(taskId);
            if (arr) {
                const idx = arr.indexOf(runId);
                if (idx >= 0) arr.splice(idx, 1);
                if (arr.length === 0) this.runIdsByTaskId.delete(taskId);
            }

            this.runtimes.delete(runId);
            this.procs.delete(runId);
            this.outputTailByRunId.delete(runId);
            target--;
        }
    }

    private pruneOrphanSafe(orphanTaskIds: string[]) {
        for (const taskId of orphanTaskIds) {
            const activeRunId = this.activeRunByTaskId.get(taskId);
            if (activeRunId) {
                const rt = this.runtimes.get(activeRunId);
                if (rt && (rt.status === "running" || rt.status === "stopping")) {
                    continue;
                }
                this.activeRunByTaskId.delete(taskId);
            }

            const arr = this.runIdsByTaskId.get(taskId);
            if (arr && arr.length > 0) {
                const keep: string[] = [];

                for (const runId of arr) {
                    if (this.procs.has(runId)) {
                        keep.push(runId);
                        continue;
                    }
                    if (this.activeRunByTaskId.get(taskId) === runId) {
                        keep.push(runId);
                        continue;
                    }

                    this.runtimes.delete(runId);
                    this.procs.delete(runId);
                }

                if (keep.length > 0) this.runIdsByTaskId.set(taskId, keep);
                else this.runIdsByTaskId.delete(taskId);
            } else {
                this.activeRunByTaskId.delete(taskId);
            }
        }

        this.pruneRunsGlobal();
    }

    private pruneOrphanAll(orphanTaskIds: string[]) {
        this.pruneOrphanSafe(orphanTaskIds);
    }

    private async analyzeAfterExit(spec: TaskDefinition, runtime: TaskRuntime) {
        this.events.emit(TaskEvents.TASK_ANALYZE_STARTED, {
            projectId: spec.projectId,
            taskId: spec.id,
            runId: runtime.runId,
        });

        try {
            const report = await this.analyzerService.analyze(spec, runtime);
            this.events.emit(TaskEvents.TASK_ANALYZE_FINISHED, {
                projectId: spec.projectId,
                taskId: spec.id,
                runId: runtime.runId,
                report,
            });
        } catch (e: any) {
            this.events.emit(TaskEvents.TASK_ANALYZE_FAILED, {
                projectId: spec.projectId,
                taskId: spec.id,
                runId: runtime.runId,
                error: e?.message ?? String(e),
            });
            throw e;
        }
    }

    private appendTaskOutput(runId: string, taskId: string, text: string, stream: LogStreamType = 'stdout') {
        const outputPayload: TaskOutputPayload = { runId, taskId, stream, text };
        const level: SystemLogLevel = stream === 'stderr' ? 'warn' : 'info';
        const log = { ts: Date.now(), level, source: "task" as const, scope: "task" as const, refId: runId, text };
        this.taskStreamLog.append(log);
        this.updateRuntimeFromOutput(runId, text, stream);
        this.events.emit(TaskEvents.TASK_OUTPUT, outputPayload);
    }

    private updateRuntimeFromOutput(runId: string, text: string, stream: LogStreamType) {
        const runtime = this.runtimes.get(runId);
        if (!runtime) return;

        const clean = normalizeTaskOutput(text);
        const prevTail = this.outputTailByRunId.get(runId) ?? "";
        const nextTail = (prevTail + clean).slice(-4000);
        this.outputTailByRunId.set(runId, nextTail);
        const patch = parseTaskOutput(nextTail);
        let changed = false;
        const now = Date.now();
        runtime.lastOutputAt = now;
        changed = true;

        if (patch.urls?.length) {
            const urls = new Set(runtime.urls ?? []);
            for (const url of patch.urls) urls.add(url);
            const next = [...urls];
            if (next.length !== (runtime.urls?.length ?? 0)) {
                runtime.urls = next;
                changed = true;
            }
        }

        if (patch.ready && !runtime.readyAt) {
            runtime.readyAt = now;
            changed = true;
        }

        if (typeof patch.rebuildDurationMs === "number") {
            runtime.rebuildDurationMs = patch.rebuildDurationMs;
            changed = true;
        }

        if (patch.compilationFinished) {
            if (patch.resetProblems) {
                runtime.errorsCount = patch.errorsCount ?? 0;
                runtime.warningsCount = patch.warningsCount ?? 0;
                if ((runtime.errorsCount ?? 0) === 0) {
                    runtime.lastError = undefined;
                }
            } else {
                runtime.errorsCount = patch.errorsCount ?? (patch.error ? 1 : runtime.errorsCount ?? 0);
                runtime.warningsCount = patch.warningsCount ?? (patch.warning || stream === "stderr" ? 1 : runtime.warningsCount ?? 0);
                if ((runtime.errorsCount ?? 0) > 0) {
                    runtime.lastError = text.trim().slice(0, 500);
                }
            }
            changed = true;
        }

        if (!changed) return;
        this.runtimes.set(runId, runtime);
        this.events.emit(TaskEvents.TASK_RUNTIME_UPDATED, {
            ...runtime,
        });
    }

    private appendSysLog(refId: string, text: string, level: SystemLogLevel, data?: any) {
        this.sysLog.append({
            level,
            source: "system",
            scope: "task",
            refId,
            text,
            data
        });
    }
}
