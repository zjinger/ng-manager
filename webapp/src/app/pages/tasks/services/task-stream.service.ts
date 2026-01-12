import { Injectable } from "@angular/core";
import { WsClientService } from "@app/core/ws/ws-client.service";
import { type WsClientMsg, type WsServerMsg, type WsState, type TaskEventMsg, type TaskEventType, TaskEventPayloadMap, TaskSnapshotPayload, TaskStartedPayload, TaskExitedPayload } from "@core/ws";
import type { TaskOutputMsg, TaskRuntimeStatus } from "@models/task.model";
import { Subject } from "rxjs";
import { TaskRuntimeStore } from "./task-runtime-store";


@Injectable({ providedIn: "root" })
export class TaskStreamService {
  private outputByRun = new Map<string, Subject<TaskOutputMsg>>();
  private event$ = new Subject<TaskEventMsg>();

  private subs = new Map<string, number>(); // taskId -> tail
  private lastWsState: WsState = "idle";

  constructor(
    private ws: WsClientService,
    private runtimeStore: TaskRuntimeStore
  ) {
    this.ws.messages().subscribe((msg) => this.onMessage(msg));

    this.ws.stateChanges().subscribe((s) => {
      if (s === "open" && this.lastWsState !== "open") {
        this.replaySubs();
      }
      this.lastWsState = s;
    });
  }

  ensureConnected() {
    this.ws.connect();
  }

  subscribeTask(taskId: string, tail = 200) {
    const id = taskId.trim();
    if (!id) return;
    const t = Math.max(0, Math.min(5000, tail | 0));
    if (this.subs.get(id) === t) return;

    this.subs.set(id, t);
    if (this.ws.isOpen()) {
      this.ws.send({ op: "sub", topic: "task", taskId: id, tail: t });
    }
  }

  unsubscribeTask(taskId: string) {
    const id = taskId.trim();
    if (!this.subs.has(id)) return;
    this.subs.delete(id);
    if (this.ws.isOpen()) {
      this.ws.send({ op: "unsub", topic: "task", taskId: id });
    }
  }

  resize(taskId: string, cols: number, rows: number) {
    const id = String(taskId ?? "").trim();
    if (!id) return;
    // 仅 open 发送，避免 pending 堆积 resize
    if (!this.ws.isOpen()) return;
    this.ws.send({ op: "resize", topic: "task", taskId: id, cols, rows } as Extract<WsClientMsg, { op: "resize" }>);
  }

  output$(taskId: string) {
    return this.ensureOutput(taskId).asObservable();
  }

  events$() {
    return this.event$.asObservable();
  }

  status$(runId: string) {
    return this.runtimeStore.status$(runId);
  }

  private replaySubs() {
    for (const [taskId, tail] of this.subs.entries()) {
      this.ws.send({ op: "sub", topic: "task", taskId, tail } as WsClientMsg);
    }
  }

  private onMessage(msg: WsServerMsg) {
    const op = msg?.op;

    if (op === "task.output") {
      const taskId = String(msg.taskId ?? "").trim();
      if (!taskId) return;

      const chunk = typeof msg.chunk === "string" ? msg.chunk : String(msg.chunk ?? "");
      const stream = msg.stream === "stderr" ? "stderr" : "stdout";
      const ts = typeof msg.ts === "number" ? msg.ts : Date.now();

      this.ensureOutput(taskId).next({ taskId, runId: msg.runId, stream, chunk, ts });
      return;
    }

    if (op === "task.event") {
      const { taskId, runId, type, payload } = msg;
      const ts = typeof (msg as any).ts === "number" ? (msg as any).ts : Date.now();
      // 事件先发出去（StateService 用它维护 taskId -> runId）
      this.event$.next({ taskId, runId, type, payload, ts } as TaskEventMsg);
      // 再落 store
      const next = this.mapEventToStatus(type, payload);
      console.log("[task stream] event", next);
      if (next) this.runtimeStore.setTaskStatus(taskId, next);

      if (type === "failed") {
        const errText = `[failed] ${payload?.error ?? ""}`.trim();
        if (errText) {
          this.ensureOutput(runId).next({ taskId, runId, stream: "stderr", chunk: errText + "\n", ts: Date.now() });
        }
      }
    }
  }

  private ensureOutput(taskId: string) {
    const id = String(taskId ?? "").trim();
    if (!this.outputByRun.has(id)) this.outputByRun.set(id, new Subject<TaskOutputMsg>());
    return this.outputByRun.get(id)!;
  }

  private mapEventToStatus<K extends TaskEventType>(type: K, payload: TaskEventPayloadMap[K]): TaskRuntimeStatus | null {
    if (type === "snapshot" && (payload as TaskSnapshotPayload)?.status) {
      const { status, startedAt, stoppedAt, pid, exitCode, signal } = payload as TaskSnapshotPayload;
      return {
        status: status as TaskRuntimeStatus["status"],
        startedAt: startedAt,
        stoppedAt: stoppedAt,
        pid: pid,
        exitCode: exitCode,
        signal: signal,
      }
    }
    else if (type === "started") {
      const { pid, startedAt } = payload as TaskStartedPayload;
      return { status: "running", pid: pid, startedAt: startedAt }
    }
    else if (type === "stopRequested") return { status: "stopping" };
    else if (type === "exited") {
      const { exitCode, signal, stoppedAt } = payload as TaskExitedPayload;
      return { status: "stopped", exitCode, signal, stoppedAt }
    }
    else if (type === "failed") return { status: "stopped" };
    return null;
  }
}
