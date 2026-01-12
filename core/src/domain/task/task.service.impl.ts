import { AppError } from "../../common/errors";
import { genId } from "../../common/id";
import type { IEventBus } from "../../infra/event/event-bus";
import { Events, type CoreEventMap } from "../../infra/event/events";
import type { ILogStore } from "../../infra/log/log.store";
import { ProcessService, ProcHandle } from "../process";
import { genSpecsFromScripts } from "./generators/genSpecsFromScripts";
import type { TaskRuntime, TaskDefinition, TaskRow } from "./task.types";
import type { TaskService } from "./task.service";
import { ProjectService } from "../project";

function bufToText(b: Buffer) {
    // 统一转 utf8，后续需要 gbk，可在这里扩展
    return b.toString("utf8");
}
export class TaskServiceImpl implements TaskService {
    private specs = new Map<string, TaskDefinition>();     // key: taskId, value: spec
    private activeRunByTaskId = new Map<string, string>(); // key: taskId, value: runId
    private runtimes = new Map<string, TaskRuntime>();     // key: runId , value: runtime
    private procs = new Map<string, ProcHandle>(); // key: runId , value: proc handle

    constructor(
        private projectService: ProjectService,
        private proc: ProcessService,
        private sysLog: ILogStore,
        private taskLog: ILogStore,
        private events: IEventBus<CoreEventMap>
    ) { }

    async start(taskId: string): Promise<TaskRuntime> {
        const spec = this.specs.get(taskId);
        if (!spec?.command) {
            throw new AppError("TASK_SPEC_NOT_FOUND", "Task spec not found or not runnable", { taskId });
        }
        // 同 task 不允许同时跑（running / stopping 都算占用）
        const active = this.activeRunByTaskId.get(taskId);
        if (active) {
            const rt = this.runtimes.get(active);
            if (rt?.status === "running" || rt?.status === "stopping") {
                throw new AppError("TASK_ALREADY_RUNNING", "Task already running", { taskId, runId: active });
            }
            // active 指向了一个已经结束的 run：清掉
            this.activeRunByTaskId.delete(taskId);
        }

        const runId = `run:${genId()}`;
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
        // syslog
        this.sysLog.append({
            ts: Date.now(),
            level: "info",
            source: "system",
            refId: runId,
            text: `[task] run: ${spec.name}`,
        });
        this.events.emit(Events.SYSLOG_APPENDED, { entry: this.sysLog.tail(1)[0]! });
        let p: any;
        try {
            // node-pty driver：这里的 command 仍然是整段字符串
            // 先给默认 cols/rows，后续前端会 task.resize(taskId, cols, rows)
            p = await this.proc.spawn(spec.command, [], {
                cwd: spec.cwd!,
                env: spec.env,
                shell: spec.shell ?? true,
                cols: 140,
                rows: 40,
            });
        } catch (e: any) {
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
            this.sysLog.append({
                ts: Date.now(),
                level: "error",
                source: "system",
                refId: runId,
                text: `[task] spawn failed: ${e?.message ?? String(e)}`,
                data: { taskId, runId },
            });
            this.events.emit(Events.SYSLOG_APPENDED, { entry: this.sysLog.tail(1)[0]! });
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
        this.procs.set(runId, {
            pid: p.pid,
            interrupt: typeof p.interrupt === "function" ? () => p.interrupt() : undefined,
            kill: (sig?: NodeJS.Signals) => {
                try {
                    p.kill(sig);
                } catch { }
            },
            resize: typeof p.resize === "function" ? (c, r) => p.resize(c, r) : undefined,
        });
        // console.log(`[task] started: taskId=${taskId} runId=${runId} pid=${p.pid}`);
        this.events.emit(Events.TASK_STARTED, { taskId, runId, pid: p.pid, startedAt: rt.startedAt! });

        // 输出：优先 PTY 的 onData（如果 driver 提供）
        if (typeof p.onData === "function") {
            p.onData((data: string) => {
                // data 本身是 string（包含 \r\n 和 ANSI）
                const text = typeof data === "string" ? data : String(data ?? "");
                this.taskLog.append({ ts: Date.now(), level: "info", source: "task", refId: runId, text });
                this.events.emit(Events.TASK_OUTPUT, { taskId, runId, text, stream: "stdout" });
            });
        } else {
            // 兼容 pipe driver
            p.onStdout?.((chunk: Buffer) => {
                const text = bufToText(chunk);
                this.taskLog.append({ ts: Date.now(), level: "info", source: "task", refId: runId, text });
                this.events.emit(Events.TASK_OUTPUT, { taskId, runId, text, stream: "stdout" });
            });
            p.onStderr?.((chunk: Buffer) => {
                const text = bufToText(chunk);
                this.taskLog.append({ ts: Date.now(), level: "warn", source: "task", refId: runId, text });
                this.events.emit(Events.TASK_OUTPUT, { taskId, runId, text, stream: "stderr" });
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
            // syslog
            this.sysLog.append({
                ts: Date.now(),
                level: cur.status === "failed" ? "error" : "info",
                source: "system",
                refId: runId,
                text: `[task] exited: status=${cur.status} code=${code} signal=${signal}`,
            });

            this.events.emit(Events.SYSLOG_APPENDED, { entry: this.sysLog.tail(1)[0]! });

            this.events.emit(Events.TASK_EXITED, { taskId, runId, exitCode: code, signal, stoppedAt: cur.stoppedAt! });

            if (cur.status === "failed") {
                this.events.emit(Events.TASK_FAILED, { taskId, runId, error: `exit code=${code}` });
            }
        });

        return rt;
    }

    async stop(taskId: string): Promise<TaskRuntime> {
        const runId = this.activeRunByTaskId.get(taskId);
        if (!runId) throw new AppError("RUN_NOT_FOUND", "Run not found", { taskId });
        const rt = this.runtimes.get(runId);
        if (!rt) throw new AppError("RUN_NOT_FOUND", "Run not found", { runId });

        if (rt.status !== "running") return rt;

        rt.status = "stopping";
        this.runtimes.set(runId, rt);

        this.sysLog.append({
            ts: Date.now(),
            level: "info",
            source: "system",
            refId: runId,
            text: `[task] stop requested`,
        });
        this.events.emit(Events.SYSLOG_APPENDED, { entry: this.sysLog.tail(1)[0]! });

        this.events.emit(Events.TASK_STOP_REQUESTED, { taskId: rt.taskId, runId });

        // 可靠停止：Ctrl+C -> 超时 -> kill
        this.stopReliable(runId).catch(() => { });

        return rt;
    }
    async status(taskId: string): Promise<TaskRuntime> {
        const runId = this.activeRunByTaskId.get(taskId);
        if (!runId) throw new AppError("RUN_NOT_FOUND", `Run not found for task: ${taskId}`, { taskId });
        const rt = this.runtimes.get(runId);
        if (!rt) throw new AppError("RUN_NOT_FOUND", `Run not found: ${runId}`, { runId });
        return rt;
    }

    /**
     * 从 ProjectMeta 刷新 specs（并返回聚合视图，UI 直接用）
     */
    async refreshByProject(projectId: string): Promise<TaskRow[]> {
        const project = await this.projectService.get(projectId);

        const rootDir = project.root;
        const scripts = project.scripts ?? {};
        const pm = project.packageManager ?? "npm";
        // 生成新的 specs
        const nextSpecs = genSpecsFromScripts(projectId, rootDir, scripts, pm);
        // 清理该 projectId 的旧 specs（只清 specs，不碰 runtimes）
        for (const [id, s] of this.specs.entries()) {
            if (s.projectId === projectId) this.specs.delete(id);
        }

        // 2) 写入新 specs
        for (const s of nextSpecs) this.specs.set(s.id, s);

        // 3) 可选：清理“孤儿 runtime”
        // 例如 scripts 被删了，runtime 还在（先不动也行）
        // 先不删，避免用户正在跑但 scripts 被改导致 UI 突然消失。
        // 真要做清理，可以加一个 opts: { pruneOrphan?: boolean }
        this.sysLog.append({
            ts: Date.now(),
            level: "info",
            source: "system",
            refId: projectId,
            text: `[task] refreshed ${nextSpecs.length} specs from project scripts`,
        });
        this.events.emit(Events.TASK_SPECS_REFRESHED, { projectId, count: nextSpecs.length });
        return await this.listViewsByProject(projectId);
    }

    /**
     * 
     * 聚合视图
     */
    async listViewsByProject(projectId: string): Promise<TaskRow[]> {
        const specs = await this.listSpecsByProject(projectId);
        const rtByTaskId = new Map<string, TaskRuntime>(); // key: taskId, value: runtime
        for (const rt of this.runtimes.values()) {
            if (rt.projectId === projectId) rtByTaskId.set(rt.taskId, rt);
        }
        return specs.map((spec) => ({
            spec,
            runtime: rtByTaskId.get(spec.id),
        }));
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
     */
    async getSnapshotByTaskId(taskId: string): Promise<TaskRuntime | null> {
        const activeRunId = this.activeRunByTaskId.get(taskId);
        if (!activeRunId) return null;
        return this.runtimes.get(activeRunId) ?? null;
    }

    // logs
    async getTailLogsByRun(runId: string, tail: number) {
        return this.taskLog.tail(Math.min(tail, 5000), { refId: runId, source: "task" });
    }

    // syslog
    async getSyslogTail(tail: number) {
        return this.sysLog.tail(Math.min(tail, 2000), { source: "system" });
    }

    /** 给 WS 的 task.resize 用 */
    resizeRun(taskId: string, cols: number, rows: number) {
        const runId = this.activeRunByTaskId.get(taskId);
        if (!runId) return;
        const h = this.procs.get(runId);
        if (!h?.resize) return;
        h.resize(cols, rows);
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

}
