import { CoreError, CoreErrorCodes } from "../../common/errors";
import { uid } from "../../common/id";
import { type CoreEventMap, Events, IEventBus } from "../../infra/event";
import { ILogStore, LogLine } from "../../infra/log";
import type { ProcHandle, SpawnedProcess } from "@yinuo-ngm/process";
import type { LogStreamType, SystemLogLevel, TaskOutputPayload } from "@yinuo-ngm/protocol";
import { SystemLogService } from "../logger";
import type { ProcessService } from "@yinuo-ngm/process";
import { ProjectService } from "../project";
import { NodeVersionService } from "../node-version/node-version.service";
import { genSpecsFromScripts } from "./generators/genSpecsFromScripts";
import type { TaskService } from "./task.service";
import type { TaskDefinition, TaskRow, TaskRuntime } from "./task.types";

function bufToText(b: Buffer) {
    // 统一转 utf8，后续需要 gbk，可在这里扩展
    return b.toString("utf8");
}
export class TaskServiceImpl implements TaskService {
    private specs = new Map<string, TaskDefinition>();     // key: taskId, value: spec
    private activeRunByTaskId = new Map<string, string>(); // key: taskId, value: runId
    private runtimes = new Map<string, TaskRuntime>();     // key: runId , value: runtime
    private procs = new Map<string, ProcHandle>(); // key: runId , value: proc handle

    // 索引（task -> runId 列表，按时间从旧到新）
    private runIdsByTaskId = new Map<string, string[]>(); // key: taskId, value: runId[]

    // 清理策略
    private readonly MAX_RUNS_PER_TASK = 5; // 每个 task 最多保留的 run 记录数
    private readonly MAX_TOTAL_RUNS = 200; // 全部任务最多保留的 run 记录数

    constructor(
        private projectService: ProjectService,
        private proc: ProcessService,
        private sysLog: SystemLogService,
        private taskStreamLog: ILogStore,
        private events: IEventBus<CoreEventMap>,
        private nodeVersionService: NodeVersionService
    ) { }

    async start(taskId: string): Promise<TaskRuntime> {
        const spec = this.specs.get(taskId);
        if (!spec?.command) {
            throw new CoreError(CoreErrorCodes.TASK_SPEC_NOT_FOUND, "Task spec not found or not runnable", { taskId });
        }
        // 同 task 不允许同时跑（running / stopping 都算占用）
        const active = this.activeRunByTaskId.get(taskId);
        if (active) {
            const rt = this.runtimes.get(active);
            if (rt?.status === "running" || rt?.status === "stopping") {
                throw new CoreError(CoreErrorCodes.TASK_ALREADY_RUNNING, "Task already running", { taskId, runId: active });
            }
            // active 指向了一个已经结束的 run：清掉
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

        // 记录索引
        this.trackRun(taskId, runId);

        // syslog
        const cmdStr = `${spec.command}${(spec.args?.length ? " " + spec.args.join(" ") : "")}`;
        const text = `[Task] ${spec.projectRoot}: ${cmdStr} started`;
        // 发送 syslog
        this.appendSysLog(runId, text, 'info');
        // 全局切换 Node 版本
        let targetVersion: string | null = null;
        if (spec.projectRoot) {
            try {
                const requirement = await this.nodeVersionService.detectProjectRequirement(spec.projectRoot);
                if (requirement.voltaConfig) {
                    this.appendSysLog(
                        runId,
                        `[Node] 项目配置了 Volta (node@${requirement.voltaConfig})，由 Volta 自动切换`,
                        'info'
                    );
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
                        this.appendSysLog(
                            runId,
                            `[Node] 全局切换到 Node ${targetVersion}（项目要求 ${requirement.requiredVersion}）`,
                            'info'
                        );
                    } else if (requirement.isMatch) {
                        this.appendSysLog(
                            runId,
                            `[Node] 当前版本 ${requirement.satisfiedBy} 已满足要求 ${requirement.requiredVersion}`,
                            'info'
                        );
                    } else {
                        this.appendSysLog(
                            runId,
                            `[Node] 警告: 项目要求 ${requirement.requiredVersion}，未找到匹配的已安装版本`,
                            'warn'
                        );
                    }
                }
            } catch (e: any) {
                this.appendSysLog(runId, `[Node] 检测版本要求失败: ${e?.message ?? String(e)}`, 'warn');
            }
        }

        let p: SpawnedProcess;
        try {
            // node-pty driver：这里的 command 仍然是整段字符串
            // 先给默认 cols/rows，后续前端会 task.resize(taskId, cols, rows)
            // 全局切换 Node 版本
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
            // spawn 失败：runtime 置失败 + syslog + 事件
            const cur = this.runtimes.get(runId);
            if (cur) {
                cur.status = "failed";
                cur.stoppedAt = Date.now();
                cur.exitCode = null;
                cur.signal = null;
                this.runtimes.set(runId, cur);
            }
            this.activeRunByTaskId.delete(taskId);
            // 发送 syslog
            this.appendSysLog(runId, `[Task] ${spec.projectRoot}: spawn failed, ${e?.message ?? String(e)}`, 'error', { taskId, runId });
            // 发送 task stream log 
            this.appendTaskOutput(runId, taskId, `[Task] spawn failed: ${e?.message ?? String(e)}`, "stderr");

            this.events.emit(Events.TASK_FAILED, {
                taskId,
                runId,
                error: e?.message ?? String(e),
            });

            throw e;
        }
        // 记录 pid + proc handle
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
        // 事件：started
        this.events.emit(Events.TASK_STARTED, { taskId, runId, pid: p.pid, startedAt: rt.startedAt!, projectId: spec.projectId });

        // 输出：优先 PTY 的 onData（如果 driver 提供）
        if (typeof p.onData === "function") {
            p.onData((data: string) => {
                // data 本身是 string（包含 \r\n 和 ANSI）
                const text = typeof data === "string" ? data : String(data ?? "");
                this.appendTaskOutput(runId, taskId, text);
            });
        } else {
            // 兼容 pipe driver
            p.onStdout?.((chunk: Buffer) => {
                const text = bufToText(chunk);
                this.appendTaskOutput(runId, taskId, text);
            });
            p.onStderr?.((chunk: Buffer) => {
                const text = bufToText(chunk);
                this.appendTaskOutput(runId, taskId, text, "stderr");
            });
        }

        // exit
        p.onExit((code: number | null, signal: string | null) => {
            const cur = this.runtimes.get(runId);
            if (!cur) return;
            cur.exitCode = code;
            cur.signal = signal;
            cur.stoppedAt = Date.now();
            // final status 规则（关键点：stopping 的退出统一算 stopped）
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
            // active 指针只在当前 runId 才清
            const active2 = this.activeRunByTaskId.get(taskId);
            if (active2 === runId) this.activeRunByTaskId.delete(taskId);
            const stream = cur.status === "failed" ? "stderr" : "stdout";
            const sysLevel = cur.status === "failed" ? "error" : "info";
            // 发送 syslog
            const sysText = `[Task] ${spec.projectRoot}: ${cmdStr} ${cur.status}`;
            this.appendSysLog(runId, sysText, sysLevel);
            // task output event
            const taskOutputText = `[Task] exited: status=${cur.status} code=${code} signal=${signal}`;
            this.appendTaskOutput(runId, taskId, taskOutputText, stream);

            this.events.emit(Events.TASK_EXITED, { taskId, runId, exitCode: code, signal, stoppedAt: cur.stoppedAt! });
            if (cur.status === "failed") {
                this.events.emit(Events.TASK_FAILED, { taskId, runId, error: `[Task] exit code=${code}` });
            }
            // exit 后再跑一次清理（把旧 run 淘汰掉）
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

        const projectId = rt.projectId;
        let projectRoot = ''
        try {
            const project = await this.projectService.get(projectId);
            projectRoot = project.root;
        } catch { }
        this.events.emit(Events.TASK_STOP_REQUESTED, { taskId: rt.taskId, runId });
        // 可靠停止：Ctrl+C -> 超时 -> kill
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

        const projectId = rt.projectId;
        let projectRoot = '';
        try {
            const project = await this.projectService.get(projectId);
            projectRoot = project.root;
        } catch { }

        // 先停止当前任务
        rt.status = "stopping";
        this.runtimes.set(runId, rt);
        this.events.emit(Events.TASK_STOP_REQUESTED, { taskId: rt.taskId, runId });

        // 等待可靠停止完成
        await this.stopReliable(runId);

        // 重新启动任务
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
        // 可选：按 startedAt 排序
        out.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
        return out;
    }

    /**
     * 从 ProjectMeta 刷新 specs（并返回聚合视图，UI 直接用）
     * - 默认不清 orphan（避免用户正在跑时 scripts 被改导致 UI 消失）
     * - 可通过 opts.pruneOrphan 开启“安全清理”
     *  - safe: 只清理那些没有 active run 的 orphan
     *  - all: 清理所有 orphan（不管有没有 active run，都删掉）
     *  - none: 不清理
     */
    async refreshByProject(
        projectId: string,
        opts: { pruneOrphan?: "none" | "safe" | "all" } = {}
    ): Promise<TaskRow[]> {
        const project = await this.projectService.get(projectId);

        const rootDir = project.root;
        const scripts = project.scripts ?? {};
        const pm = project.packageManager ?? "npm";
        const projectName = project.name;

        // 生成新的 specs
        const nextSpecs = genSpecsFromScripts(projectId, rootDir, projectName, scripts, pm);

        // 记录旧 taskIds（该 project 的）
        const prevTaskIds = new Set<string>();
        for (const [id, s] of this.specs.entries()) {
            if (s.projectId === projectId) prevTaskIds.add(id);
        }

        // 1) 清理该 projectId 的旧 specs（只清 specs，不碰 runtimes）
        for (const id of prevTaskIds) this.specs.delete(id);

        // 2) 写入新 specs
        for (const s of nextSpecs) this.specs.set(s.id, s);

        // 3) 可选：清理 “孤儿”（默认 none）
        const mode = opts.pruneOrphan ?? "none";
        if (mode !== "none") {
            const nextTaskIds = new Set(nextSpecs.map((s) => s.id));
            const orphanTaskIds = [...prevTaskIds].filter((id) => !nextTaskIds.has(id));

            if (mode === "safe") {
                this.pruneOrphanSafe(orphanTaskIds);
            } else if (mode === "all") {
                // 目前 all 先按 safe 行为处理，避免误删；后续如需更激进再扩展
                this.pruneOrphanAll(orphanTaskIds);
            }
        }
        return await this.listViewsByProject(projectId);
    }

    /**
     * 
     * 聚合视图
     */
    async listViewsByProject(projectId: string): Promise<TaskRow[]> {
        const specs = await this.listSpecsByProject(projectId);
        return specs.map((spec) => {
            let runtime: TaskRuntime | undefined;
            // 优先 active run
            const activeRunId = this.activeRunByTaskId.get(spec.id);
            if (activeRunId) {
                const rt = this.runtimes.get(activeRunId);
                if (rt) {
                    runtime = rt;
                } else {
                    // active 指针异常，清掉
                    this.activeRunByTaskId.delete(spec.id);
                }
            }
            // fallback：最近一次 run（索引里的最后一个）
            if (!runtime) {
                const arr = this.runIdsByTaskId.get(spec.id);
                if (arr && arr.length > 0) {
                    // 从后往前找一个仍存在的 runtime
                    for (let i = arr.length - 1; i >= 0; i--) {
                        const runId = arr[i]!;
                        const rt = this.runtimes.get(runId);
                        if (rt) {
                            runtime = rt;
                            break;
                        }
                        // 索引脏数据，顺手清理
                        arr.splice(i, 1);
                    }
                    // 索引清空则移除
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
        // spec 不存在也允许（因为 runtime 可能存在 / 或用户传错）
        return this.runtimes.get(runId) ?? null;
    }

    /**
     * 根据 taskId 找最近一次的 runtime 
     * 不只看 active，也返回“最近一次 run（不管是否 active）
     */
    async getSnapshotByTaskId(taskId: string): Promise<TaskRuntime | null> {
        //  优先 active
        const active = this.activeRunByTaskId.get(taskId);
        if (active) {
            const rt = this.runtimes.get(active);
            if (rt) return rt;
            // active 指针异常：清掉，继续走 fallback
            this.activeRunByTaskId.delete(taskId);
        }
        //  fallback：取该 task 最近一次 runId（索引里最后一个）
        const arr = this.runIdsByTaskId.get(taskId);
        if (!arr || arr.length === 0) return null;
        // 从后往前找第一个仍存在的 runtime（防止已被 prune/异常丢失）
        for (let i = arr.length - 1; i >= 0; i--) {
            const runId = arr[i]!;
            const rt = this.runtimes.get(runId);
            if (rt) return rt;
            // 索引里有但 runtimes 没了：顺手清理掉这个 runId，保持索引健康
            arr.splice(i, 1);
        }
        // 索引被清空
        if (arr.length === 0) this.runIdsByTaskId.delete(taskId);
        else this.runIdsByTaskId.set(taskId, arr);
        return null;
    }

    //task logs
    async getTailLogsByRun(runId: string, tail: number) {
        return this.taskStreamLog.tail(Math.min(tail, 1000), { refId: runId, source: "task" });
    }

    // syslog
    async getSyslogTail(tail: number) {
        return this.sysLog.tail(Math.min(tail, 2000), { source: "system" });
    }

    /** 给 WS 的 task.resize 用 */
    resizeRun(taskId: string, cols: number, rows: number) {
        const cur = this.getActiveRuntime(taskId);
        if (!cur) return;
        const h = this.procs.get(cur.runId);
        if (!h?.resize) return;
        h.resize(cols, rows);
    }

    /** 注册一个临时/系统任务 spec（用于 bootstrap / system ops） */
    registerSpec(spec: TaskDefinition): void {
        this.specs.set(spec.id, spec);
    }

    /* ----------------------------- stop reliable ---------------------------- */

    private sleep(ms: number) {
        return new Promise<void>((r) => setTimeout(r, ms));
    }

    /**
     * stopReliable：先 Ctrl+C（PTY），等一会儿还不退就 kill
     * - 对 npm start / ng serve 这类热更新，Ctrl+C 才是“干净退出”
     * - pipe + shell 时 kill(SIGTERM) 往往只能杀 shell，端口进程还活着
     */
    private async stopReliable(runId: string, softTimeoutMs = 1800) {
        const handle = this.procs.get(runId);
        if (!handle) return;

        // 1) soft stop：优先 Ctrl+C（PTY）
        if (handle.interrupt) {
            try {
                handle.interrupt();
            } catch { }
        } else {
            // 兼容非 PTY：先 SIGTERM
            try {
                handle.kill("SIGTERM");
            } catch { }
        }

        const t0 = Date.now();
        while (Date.now() - t0 < softTimeoutMs) {
            // onExit 会 delete procs
            if (!this.procs.has(runId)) return;
            await this.sleep(80);
        }

        // 2) hard kill
        const handle2 = this.procs.get(runId);
        if (!handle2) return;

        try {
            handle2.kill("SIGKILL");
        } catch {
            try {
                handle2.kill();
            } catch { }
        }

        // 再等一点，让 exit 回调把 runtime 收尾
        const t1 = Date.now();
        while (Date.now() - t1 < 1000) {
            if (!this.procs.has(runId)) return;
            await this.sleep(80);
        }
    }


    /* -------------------------------------------------------------------------- */
    /*                                run helpers                                 */
    /* -------------------------------------------------------------------------- */

    // 根据 taskId 找 active runtime
    private getActiveRuntime(taskId: string): { runId: string; rt: TaskRuntime } | null {
        const runId = this.activeRunByTaskId.get(taskId);
        if (!runId) return null;
        const rt = this.runtimes.get(runId);
        if (!rt) return null;
        return { runId, rt };
    }

    //  记录 run 到索引，并触发清理（只清旧的、非 active 的）
    private trackRun(taskId: string, runId: string) {
        const arr = this.runIdsByTaskId.get(taskId) ?? [];
        arr.push(runId);
        this.runIdsByTaskId.set(taskId, arr);

        this.pruneRunsForTask(taskId);
        this.pruneRunsGlobal();
    }

    //  是否允许删除某个 run（保护：active、还在 procs 里的）
    private canPruneRun(taskId: string, runId: string) {
        const active = this.activeRunByTaskId.get(taskId);
        if (active === runId) return false;
        if (this.procs.has(runId)) return false;
        return true;
    }

    //  每个 task 只保留最近 N 次 run
    private pruneRunsForTask(taskId: string) {
        const arr = this.runIdsByTaskId.get(taskId);
        if (!arr || arr.length <= this.MAX_RUNS_PER_TASK) return;

        // 从最旧的开始删
        let removed = 0;
        while (arr.length > this.MAX_RUNS_PER_TASK) {
            const oldest = arr[0]!;
            if (!this.canPruneRun(taskId, oldest)) break; // 遇到不能删的就停，避免误删
            arr.shift();
            this.runtimes.delete(oldest);
            this.procs.delete(oldest); // 理论上已不在，但安全起见
            removed++;
        }

        if (removed > 0) {
            this.runIdsByTaskId.set(taskId, arr);
        }
    }

    // 全局最多保留 M 个 run（按“索引中的时间顺序”粗略清理）
    private pruneRunsGlobal() {
        const total = this.runtimes.size;
        if (total <= this.MAX_TOTAL_RUNS) return;

        // 构造一个全局队列（旧 -> 新）
        const queue: Array<{ taskId: string; runId: string }> = [];
        for (const [taskId, runIds] of this.runIdsByTaskId.entries()) {
            for (const runId of runIds) queue.push({ taskId, runId });
        }

        // 如果索引里比 runtimes 少（异常情况），就不做全局清理，避免误删
        if (queue.length === 0) return;

        let target = total - this.MAX_TOTAL_RUNS;
        for (const item of queue) {
            if (target <= 0) break;
            const { taskId, runId } = item;

            if (!this.runtimes.has(runId)) continue;
            if (!this.canPruneRun(taskId, runId)) continue;

            // 从 task 索引里移除这个 runId
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

    /* -------------------------------------------------------------------------- */
    /*                              orphan management                              */
    /* -------------------------------------------------------------------------- */

    /**
     * 安全清理 orphan（被 scripts 删掉的 taskId）
     * 规则：
     * - 运行中的（running/stopping）不动
     * - 仅清理已结束且不在 procs 的 run
     * - 会自修复 active 指针与 run 索引
     */
    private pruneOrphanSafe(orphanTaskIds: string[]) {
        for (const taskId of orphanTaskIds) {
            // 如果 task 还有 active run（运行中/停止中），不动
            const activeRunId = this.activeRunByTaskId.get(taskId);
            if (activeRunId) {
                const rt = this.runtimes.get(activeRunId);
                if (rt && (rt.status === "running" || rt.status === "stopping")) {
                    continue;
                }
                // active 指针异常或已结束：可以清掉指针，但不强删 runtime
                this.activeRunByTaskId.delete(taskId);
            }

            // 清理该 task 下“可安全删除的 run”（不在 procs、非 active）
            const arr = this.runIdsByTaskId.get(taskId);
            if (arr && arr.length > 0) {
                const keep: string[] = [];

                for (const runId of arr) {
                    // 保护：在 procs 的不删（理论上不会发生，但兜底）
                    if (this.procs.has(runId)) {
                        keep.push(runId);
                        continue;
                    }
                    // 保护：仍是 active 的不删（兜底）
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
                // 索引都没了：兜底清 active
                this.activeRunByTaskId.delete(taskId);
            }
        }

        // 全局再跑一次，保持上限
        this.pruneRunsGlobal();
    }

    /**
     * all 模式：目前等价 safe（避免误删）
     * - 如果未来要更激进，建议只在“用户主动点击清理/重建”场景开放
     */
    private pruneOrphanAll(orphanTaskIds: string[]) {
        this.pruneOrphanSafe(orphanTaskIds);
    }

    /**
     * 添加一条任务流日志
     * @param runId 运行 ID
     * @param taskId 任务 ID
     * @param text 日志内容
     * @param stream 日志流类型，stdout | stderr
     */
    private appendTaskOutput(runId: string, taskId: string, text: string, stream: LogStreamType = 'stdout') {
        const outputPayload: TaskOutputPayload = { runId, taskId, stream, text }
        const level = stream === 'stderr' ? 'warn' : 'info';
        const log: LogLine = { ts: Date.now(), level, source: "task", scope: "task", refId: runId, text }
        this.taskStreamLog.append(log);
        // 记录任务流日志
        this.events.emit(Events.TASK_OUTPUT, outputPayload);
    }

    /**
     * 添加一条系统日志
     * @param runId 关联 ID（runId）
     * @param text 日志内容
     * @param level 日志级别
     */
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
