import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';
import { uid } from '@yinuo-ngm/shared';
import type { IEventBus } from '@yinuo-ngm/event';
import type { ProcHandle, SpawnedProcess } from '@yinuo-ngm/process';
import type { LogStreamType, SystemLogLevel, TaskOutputPayload } from '@yinuo-ngm/protocol';
import type { ProcessService } from '@yinuo-ngm/process';
import type { ProjectService } from '@yinuo-ngm/project';
import type { NodeVersionService } from '@yinuo-ngm/node-version';
import { genSpecsFromScripts } from './infra/generators/genSpecsFromScripts';
import type { TaskService } from './task.service';
import type { TaskDefinition, TaskRow, TaskRuntime } from './task.types';
import { TaskEvents, type TaskEventMap } from './infra/task-event-map';
import type { TaskLogStore } from './infra/task-log-store';
import type { SystemLogService } from './infra/system-log-port';

function bufToText(b: Buffer) {
    return b.toString("utf8");
}

export class TaskServiceImpl implements TaskService {
    private specs = new Map<string, TaskDefinition>();
    private activeRunByTaskId = new Map<string, string>();
    private runtimes = new Map<string, TaskRuntime>();
    private procs = new Map<string, ProcHandle>();
    private runIdsByTaskId = new Map<string, string[]>();
    private readonly MAX_RUNS_PER_TASK = 5;
    private readonly MAX_TOTAL_RUNS = 200;

    constructor(
        private projectService: ProjectService,
        private proc: ProcessService,
        private sysLog: SystemLogService,
        private taskStreamLog: TaskLogStore,
        private events: IEventBus<TaskEventMap>,
        private nodeVersionService: NodeVersionService
    ) { }

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

        const cmdStr = `${spec.command}${(spec.args?.length ? " " + spec.args.join(" ") : "")}`;
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

            p = await this.proc.spawn(spec.command, spec.args ?? [], {
                cwd: spec.cwd!,
                env: spec.env,
                shell: spec.shell ?? false,
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

    private appendTaskOutput(runId: string, taskId: string, text: string, stream: LogStreamType = 'stdout') {
        const outputPayload: TaskOutputPayload = { runId, taskId, stream, text };
        const level: SystemLogLevel = stream === 'stderr' ? 'warn' : 'info';
        const log = { ts: Date.now(), level, source: "task" as const, scope: "task" as const, refId: runId, text };
        this.taskStreamLog.append(log);
        this.events.emit(TaskEvents.TASK_OUTPUT, outputPayload);
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
