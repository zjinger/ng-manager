import { Injectable } from "@angular/core";
import { WsClientService } from "@app/core/ws/ws-client.service";
import type { WsClientMsg, WsServerMsg, WsState, TaskEventMsg, TaskEventType, TaskEventPayloadMap, TaskSnapshotPayload, TaskStartedPayload, TaskExitedPayload, TaskOutputMsg, TaskOutputPayload } from "@core/ws";
import type { TaskRuntimeStatus } from "@models/task.model";
import { Subject } from "rxjs";
import { TaskRuntimeStore } from "./task-runtime-store";


@Injectable({ providedIn: "root" })
export class TaskStreamService {
  private outputByTaskId = new Map<string, Subject<TaskOutputMsg>>(); // taskId -> output stream
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
      const payload = msg.payload;
      const taskId = String(payload.taskId ?? "").trim();
      if (!taskId) return;
      this.ensureOutput(taskId).next(msg);
      return;
    }

    if (op === "task.event") {
      const payload = msg.payload;
      const type = msg.type;
      const { taskId, runId } = payload;
      // const { taskId, runId, type, payload } = msg;
      // const ts = typeof (msg as any).ts === "number" ? (msg as any).ts : Date.now();
      // 事件先发出去（StateService 用它维护 taskId -> runId）
      this.event$.next(msg);
      // 再落 store
      const next = this.mapEventToStatus(type, payload);
      console.log("[task stream] event", next);
      if (next) this.runtimeStore.setTaskStatus(taskId, next);
      // 每个 taskId 都会 new Subject()，但从来不 complete()、不 delete()
      // 所以需要清理
      if (type === "exited" || type === "failed") {
        setTimeout(() => {
          this.outputByTaskId.delete(taskId);
        }, 5 * 60 * 1000);
      }
      if (type === "failed") {
        const failePayload = payload as TaskEventPayloadMap["failed"];
        const errText = `[failed] ${failePayload?.error ?? ""}`.trim();
        const outputPayload: TaskOutputPayload = {
          runId,
          taskId,
          stream: "stderr",
          text: errText + "\n",
        }
        this.ensureOutput(taskId).next({ op: "task.output", payload: outputPayload, ts: msg.ts });
      }
    }
  }

  private ensureOutput(taskId: string) {
    const id = String(taskId ?? "").trim();
    if (!this.outputByTaskId.has(id)) this.outputByTaskId.set(id, new Subject<TaskOutputMsg>());
    return this.outputByTaskId.get(id)!;
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
    else if (type === "bootstrapDone" || type === "bootstrapFailed") {
      // 不变更状态
      return null;
    }
    return null;
  }
}
