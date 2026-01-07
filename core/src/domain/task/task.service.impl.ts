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
    private specs = new Map<string, TaskDefinition>();     // key: spec.id
    private runtimes = new Map<string, TaskRuntime>();     // key: taskId(=spec.id)
    private procs = new Map<string, { kill: (s?: NodeJS.Signals) => void }>();

    constructor(
        private projectService: ProjectService,
        private proc: ProcessService,
        private log: ILogStore,
        private events: IEventBus<CoreEventMap>
    ) { }

    async start(taskId: string): Promise<TaskRuntime> {
        const spec = this.specs.get(taskId);
        if (!spec) {
            throw new AppError("TASK_SPEC_NOT_FOUND", `Task spec not found: ${taskId}`, {
                taskId,
            });
        }
        if (!spec.command) {
            throw new AppError("TASK_NOT_RUNNABLE", `Task is description only: ${spec.name}`, {
                taskId,
                name: spec.name,
            });
        }

        const existed = this.runtimes.get(taskId);
        if (existed?.status === "running") {
            throw new AppError("TASK_ALREADY_RUNNING", `Task already running: ${taskId}`, {
                taskId,
            });
        }

        const runtime: TaskRuntime = {
            taskId: spec.id,               // 关键：taskId === spec.id
            projectId: spec.projectId,
            name: spec.name,
            status: "running",
            startedAt: Date.now(),
        };

        this.runtimes.set(taskId, runtime);

        this.log.append({
            ts: Date.now(),
            level: "info",
            source: "system",
            refId: taskId,
            text: `[task] start: ${spec.command} (cwd=${spec.cwd})`,
        });

        try {
            const p = await this.proc.spawn(spec.command, [], {
                cwd: spec.cwd!,
                env: spec.env,
                shell: spec.shell ?? true,
            });

            runtime.pid = p.pid;
            this.runtimes.set(taskId, runtime);
            this.procs.set(taskId, { kill: p.kill });

            this.events.emit(Events.TASK_STARTED, {
                taskId: taskId,
                pid: p.pid,
            });

            /* ---------- stdout ---------- */
            p.onStdout((chunk) => {
                const text = bufToText(chunk);
                this.log.append({
                    ts: Date.now(),
                    level: "info",
                    source: "task",
                    refId: taskId,
                    text,
                });
                this.events.emit(Events.TASK_OUTPUT, {
                    taskId: taskId,
                    text,
                    stream: "stdout",
                });
                this.events.emit(Events.LOG_APPENDED, { refId: taskId });
            });

            /* ---------- stderr ---------- */
            p.onStderr((chunk) => {
                const text = bufToText(chunk);
                this.log.append({
                    ts: Date.now(),
                    level: "warn",
                    source: "task",
                    refId: taskId,
                    text,
                });
                this.events.emit(Events.TASK_OUTPUT, {
                    taskId: taskId,
                    text,
                    stream: "stderr",
                });
                this.events.emit(Events.LOG_APPENDED, { refId: taskId });
            });

            /* ---------- exit ---------- */
            p.onExit((code, signal) => {
                const cur = this.runtimes.get(taskId);
                if (!cur) return;

                cur.exitCode = code;
                cur.signal = signal;
                cur.stoppedAt = Date.now();
                cur.status = code === 0 || code === null ? "stopped" : "failed";

                this.runtimes.set(taskId, cur);
                this.procs.delete(taskId);

                this.log.append({
                    ts: Date.now(),
                    level: cur.status === "failed" ? "error" : "info",
                    source: "system",
                    refId: taskId,
                    text: `[task] exited: code=${code} signal=${signal}`,
                });

                this.events.emit(Events.TASK_EXITED, {
                    taskId: taskId,
                    exitCode: code,
                    signal,
                });

                if (cur.status === "failed") {
                    this.events.emit(Events.TASK_FAILED, {
                        taskId: taskId,
                        error: `exit code=${code}`,
                    });
                }

                this.events.emit(Events.LOG_APPENDED, { refId: taskId });
            });

            return runtime;
        } catch (e: any) {
            runtime.status = "failed";
            runtime.lastError = e?.message || String(e);
            runtime.stoppedAt = Date.now();
            this.runtimes.set(taskId, runtime);

            this.log.append({
                ts: Date.now(),
                level: "error",
                source: "system",
                refId: taskId,
                text: `[task] spawn failed: ${runtime.lastError}`,
            });

            this.events.emit(Events.TASK_FAILED, {
                taskId: taskId,
                error: runtime.lastError || null,
            });
            this.events.emit(Events.LOG_APPENDED, { refId: taskId });
            throw e;
        }
    }

    async stop(taskId: string): Promise<TaskRuntime> {
        const rt = this.runtimes.get(taskId);
        if (!rt) {
            throw new AppError("TASK_NOT_FOUND", `Task not found: ${taskId}`, {
                taskId,
            });
        }
        if (rt.status !== "running") return rt;
        const proc = this.procs.get(taskId);
        if (proc) {
            proc.kill("SIGTERM"); // TODO: Windows 后续可升级为 killTree
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
            // 极端情况：没有进程句柄
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
        this.log.append({
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

}
