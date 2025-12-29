import type { TaskService } from "./task.service";
import type { TaskRuntime, TaskSpec } from "./task.model";
import { AppError } from "../../common/errors";
import { genId } from "../../common/id";
import type { ILogStore } from "../../infra/log/log.store";
import type { IEventBus } from "../../infra/event/event-bus";
import { Events, type CoreEventMap } from "../../infra/event/events";
import { ProcessService } from "../process/process.service";

function bufToText(b: Buffer) {
    // 统一转 utf8，后续需要 gbk，可在这里扩展
    return b.toString("utf8");
}

export class TaskServiceImpl implements TaskService {
    private specs = new Map<string, TaskSpec>();
    private runtimes = new Map<string, TaskRuntime>();
    private procs = new Map<string, { kill: (s?: NodeJS.Signals) => void }>();

    constructor(
        private processService: ProcessService,
        private log: ILogStore,
        private events: IEventBus<CoreEventMap>
    ) { }

    async start(input: Omit<TaskSpec, "id"> & { id?: string }): Promise<TaskRuntime> {
        const id = input.id ?? genId("task");
        const existed = this.runtimes.get(id);
        if (existed?.status === "running") {
            throw new AppError("TASK_ALREADY_RUNNING", `Task already running: ${id}`, { taskId: id });
        }

        const spec: TaskSpec = {
            id,
            projectId: input.projectId,
            name: input.name,
            command: input.command,
            cwd: input.cwd,
            shell: input.shell ?? true,
            env: input.env,
        };
        this.specs.set(id, spec);

        const runtime: TaskRuntime = {
            taskId: id,
            projectId: spec.projectId,
            name: spec.name,
            status: "running",
            startedAt: Date.now(),
        };
        this.runtimes.set(id, runtime);

        this.log.append({
            ts: Date.now(),
            level: "info",
            source: "system",
            refId: id,
            text: `[task] start: ${spec.command} (cwd=${spec.cwd})`,
        });

        try {
            const p = await this.processService.spawn(spec.command, {
                cwd: spec.cwd,
                env: spec.env,
                shell: spec.shell,
            });

            runtime.pid = p.pid;
            this.runtimes.set(id, runtime);

            this.procs.set(id, { kill: p.kill });

            this.events.emit(Events.TASK_STARTED, { taskId: id, pid: p.pid });

            p.onStdout((chunk) => {
                const text = bufToText(chunk);
                this.log.append({ ts: Date.now(), level: "info", source: "task", refId: id, text });
                this.events.emit(Events.TASK_OUTPUT, { taskId: id, text, stream: "stdout" });
                this.events.emit(Events.LOG_APPENDED, { refId: id });
            });

            p.onStderr((chunk) => {
                const text = bufToText(chunk);
                this.log.append({ ts: Date.now(), level: "warn", source: "task", refId: id, text });
                this.events.emit(Events.TASK_OUTPUT, { taskId: id, text, stream: "stderr" });
                this.events.emit(Events.LOG_APPENDED, { refId: id });
            });

            p.onExit((code, signal) => {
                const cur = this.runtimes.get(id);
                if (!cur) return;

                cur.exitCode = code;
                cur.signal = signal;
                cur.stoppedAt = Date.now();

                // 如果是 stop() 主动杀的，也会走这里：统一视为 stopped
                cur.status = code === 0 || code === null ? "stopped" : "failed";

                this.runtimes.set(id, cur);
                this.procs.delete(id);

                this.log.append({
                    ts: Date.now(),
                    level: cur.status === "failed" ? "error" : "info",
                    source: "system",
                    refId: id,
                    text: `[task] exited: code=${code} signal=${signal}`,
                });

                this.events.emit(Events.TASK_EXITED, { taskId: id, exitCode: code, signal });
                if (cur.status === "failed") {
                    this.events.emit(Events.TASK_FAILED, { taskId: id, error: `exit code=${code}` });
                }
                this.events.emit(Events.LOG_APPENDED, { refId: id });
            });

            return runtime;
        } catch (e: any) {
            runtime.status = "failed";
            runtime.lastError = e?.message || String(e);
            runtime.stoppedAt = Date.now();
            this.runtimes.set(id, runtime);

            this.log.append({
                ts: Date.now(),
                level: "error",
                source: "system",
                refId: id,
                text: `[task] spawn failed: ${runtime.lastError}`,
            });

            this.events.emit(Events.TASK_FAILED, { taskId: id, error: runtime.lastError || null });
            this.events.emit(Events.LOG_APPENDED, { refId: id });

            throw e;
        }
    }

    async stop(taskId: string): Promise<TaskRuntime> {
        const rt = this.runtimes.get(taskId);
        if (!rt) throw new AppError("TASK_NOT_FOUND", `Task not found: ${taskId}`, { taskId });

        if (rt.status !== "running") return rt;

        const proc = this.procs.get(taskId);
        if (proc) {
            // 先尝试优雅结束
            proc.kill("SIGTERM");
            this.log.append({
                ts: Date.now(),
                level: "info",
                source: "system",
                refId: taskId,
                text: `[task] stop requested (SIGTERM)`,
            });
            this.events.emit(Events.TASK_STOPPED, { taskId });
            this.events.emit(Events.LOG_APPENDED, { refId: taskId });
        } else {
            // 没进程句柄：直接标 stopped（极端情况）
            rt.status = "stopped";
            rt.stoppedAt = Date.now();
            this.runtimes.set(taskId, rt);
        }

        return this.runtimes.get(taskId)!;
    }

    async status(taskId: string): Promise<TaskRuntime> {
        const rt = this.runtimes.get(taskId);
        if (!rt) throw new AppError("TASK_NOT_FOUND", `Task not found: ${taskId}`, { taskId });
        return rt;
    }

    async listByProject(projectId: string): Promise<TaskRuntime[]> {
        return Array.from(this.runtimes.values()).filter((r) => r.projectId === projectId);
    }
}
