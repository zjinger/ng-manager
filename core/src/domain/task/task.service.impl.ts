import { AppError } from "../../common/errors";
import { genId } from "../../common/id";
import type { IEventBus } from "../../infra/event/event-bus";
import { Events, type CoreEventMap } from "../../infra/event/events";
import type { ILogStore } from "../../infra/log/log.store";
import { ProcessService } from "../process";
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
    private procs = new Map<string, { kill: (s?: NodeJS.Signals) => void }>(); // key: runId , value: proc handle

    constructor(
        private projectService: ProjectService,
        private proc: ProcessService,
        private sysLog: ILogStore,
        private taskLog: ILogStore,
        private events: IEventBus<CoreEventMap>
    ) { }

    async start(taskId: string): Promise<TaskRuntime> {
        const spec = this.specs.get(taskId);
        if (!spec?.command) throw new AppError("TASK_SPEC_NOT_FOUND", "Task spec not found or not runnable", { taskId });

        const active = this.activeRunByTaskId.get(taskId);
        if (active) {
            const rt = this.runtimes.get(active);
            if (rt?.status === "running" || rt?.status === "stopping") {
                throw new AppError("TASK_ALREADY_RUNNING", "Task already running", { taskId, runId: active });
            }
        }

        const runId = `run:${genId()}`; // 或 uuid
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

        // syslog: run requested
        this.sysLog.append({ ts: Date.now(), level: "info", source: "system", refId: runId, text: `[task] run: ${spec.name}` });
        this.events.emit(Events.SYSLOG_APPENDED, { entry: this.sysLog.tail(1)[0]! });

        const p = await this.proc.spawn(spec.command, [], { cwd: spec.cwd!, env: spec.env, shell: spec.shell ?? true });

        rt.pid = p.pid;
        this.runtimes.set(runId, rt);
        this.procs.set(runId, { kill: p.kill });

        this.events.emit(Events.TASK_STARTED, { taskId, runId, pid: p.pid });

        p.onStdout((chunk) => {
            const text = bufToText(chunk);
            this.taskLog.append({ ts: Date.now(), level: "info", source: "task", refId: runId, text });
            this.events.emit(Events.TASK_OUTPUT, { taskId, runId, text, stream: "stdout" });
        });

        p.onStderr((chunk) => {
            const text = bufToText(chunk);
            this.taskLog.append({ ts: Date.now(), level: "warn", source: "task", refId: runId, text });
            this.events.emit(Events.TASK_OUTPUT, { taskId, runId, text, stream: "stderr" });
        });

        p.onExit((code, signal) => {
            const cur = this.runtimes.get(runId);
            if (!cur) return;

            cur.exitCode = code;
            cur.signal = signal;
            cur.stoppedAt = Date.now();

            // final status
            if (signal) cur.status = "stopped";
            else if (code === 0) cur.status = "success";
            else cur.status = "failed";

            this.runtimes.set(runId, cur);
            this.procs.delete(runId);
            this.activeRunByTaskId.delete(taskId);

            // syslog: exited
            this.sysLog.append({
                ts: Date.now(),
                level: cur.status === "failed" ? "error" : "info",
                source: "system",
                refId: runId,
                text: `[task] exited: status=${cur.status} code=${code} signal=${signal}`,
            });
            this.events.emit(Events.SYSLOG_APPENDED, { entry: this.sysLog.tail(1)[0]! });

            this.events.emit(Events.TASK_EXITED, { taskId, runId, exitCode: code, signal });

            if (cur.status === "failed") {
                this.events.emit(Events.TASK_FAILED, { taskId, runId, error: `exit code=${code}` });
            }
        });

        return rt;
    }

    async stop(runId: string): Promise<TaskRuntime> {
        const rt = this.runtimes.get(runId);
        if (!rt) throw new AppError("RUN_NOT_FOUND", "Run not found", { runId });

        if (rt.status !== "running") return rt;

        rt.status = "stopping";
        this.runtimes.set(runId, rt);

        this.sysLog.append({ ts: Date.now(), level: "info", source: "system", refId: runId, text: `[task] stop requested` });
        this.events.emit(Events.SYSLOG_APPENDED, { entry: this.sysLog.tail(1)[0]! });

        const proc = this.procs.get(runId);
        if (proc) proc.kill("SIGTERM");

        this.events.emit(Events.TASK_STOP_REQUESTED, { taskId: rt.taskId, runId });

        return rt;
    }

    async status(runId: string): Promise<TaskRuntime> {
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
        const rtByTaskId = new Map<string, TaskRuntime>();
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

    // logs
    async getTailLogsByRun(runId: string, tail: number) {
        return this.taskLog.tail(Math.min(tail, 5000), { refId: runId, source: "task" });
    }

    // syslog
    async getSyslogTail(tail: number) {
        return this.sysLog.tail(Math.min(tail, 2000), { source: "system" });
    }

}
