import { Injectable } from "@angular/core";
import { WsClientService } from "@app/core/ws/ws-client.service";
import type { TaskEventMsg, TaskEventPayloadMap, TaskEventType, TaskExitedPayload, TaskOutputMsg, TaskOutputPayload, TaskSnapshotPayload, TaskStartedPayload, TaskStatus, WsClientMsg, WsServerMsg, WsState } from "@core/ws";
import type { TaskRuntime } from "@models/task.model";
import { Subject } from "rxjs";
import { TaskRuntimeStore } from "./task-runtime-store";

@Injectable({ providedIn: "root" })
export class TaskStreamService {
  private outputByTaskId = new Map<string, Subject<TaskOutputMsg>>(); // taskId -> output stream
  private event$ = new Subject<TaskEventMsg>();
  private runtimeByTaskId = new Map<string, TaskRuntime>(); // 最新 runtime（按 taskId） taskId -> TaskRuntime

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

  /** 获取最新 runtime 快照 */
  getRuntime(taskId: string): TaskRuntime | null {
    return this.runtimeByTaskId.get(taskId) ?? null;
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
      const taskId = String(payload.taskId ?? "").trim();
      if (!taskId) return;
      // 事件先发出去（StateService 用它维护 taskId -> runId）
      this.event$.next(msg);
      // 组装 TaskRuntime，然后 setRuntime
      const nextRt = this.applyEventToRuntime(type, payload);
      if (nextRt) {
        this.runtimeByTaskId.set(taskId, nextRt);
        this.runtimeStore.setRuntime(nextRt);
      }
      // 清理 output subject 
      if (type === "exited" || type === "failed") {
        setTimeout(() => this.outputByTaskId.delete(taskId), 5 * 60 * 1000);
      }
      // failed 追加一条 stderr 
      if (type === "failed") {
        const failePayload = payload as TaskEventPayloadMap["failed"];
        const errText = `[failed] ${failePayload?.error ?? ""}`.trim();
        const outputPayload: TaskOutputPayload = {
          runId: failePayload.runId,
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

  private applyEventToRuntime<K extends TaskEventType>(type: K, payload: TaskEventPayloadMap[K]): TaskRuntime | null {
    const taskId = String(payload?.taskId ?? '').trim();
    const runId = String(payload?.runId ?? '').trim();
    if (!taskId || !runId) return null;
    const prev = this.runtimeByTaskId.get(taskId);
    // 如果 runId 变了（新一次执行），以新 runId 为准
    const base: TaskRuntime = prev && prev.runId === runId
      ? { ...prev }
      : {
        taskId,
        runId,
        projectId: String(payload?.projectId ?? prev?.projectId ?? '').trim(),
        status: 'idle',
      };

    // 不同事件填充不同字段
    switch (type) {
      case "snapshot":
        const snapPayload = payload as TaskSnapshotPayload;
        base.projectId = String(snapPayload?.projectId ?? base.projectId ?? '').trim();
        base.status = snapPayload.status as TaskStatus;
        base.startedAt = snapPayload.startedAt;
        base.stoppedAt = snapPayload.stoppedAt;
        base.pid = snapPayload.pid;
        base.exitCode = snapPayload.exitCode;
        base.signal = snapPayload.signal;
        return base;
      case 'started':
        base.projectId = String(payload?.projectId ?? base.projectId ?? '').trim();
        base.status = 'running';
        base.pid = (payload as TaskStartedPayload)?.pid ?? base.pid;
        base.startedAt = (payload as TaskStartedPayload)?.startedAt ?? base.startedAt ?? Date.now();
        // 清理上一次退出字段
        base.stoppedAt = undefined;
        base.exitCode = undefined;
        base.signal = undefined;
        return base;
      case 'stopRequested':
        base.status = 'stopping';
        return base;
      case 'exited':
        // exited payload: { taskId, runId, exitCode, signal, stoppedAt }
        base.status = 'stopped'; // 后端规则里 stopping/exited 都归 stopped，但前端先落 stopped
        base.exitCode = (payload as TaskExitedPayload)?.exitCode ?? null;
        base.signal = (payload as TaskExitedPayload)?.signal ?? null;
        base.stoppedAt = (payload as TaskExitedPayload)?.stoppedAt ?? Date.now();
        return base;
      case 'failed':
        // failed payload: { taskId, runId, error }
        // 失败事件未必代表进程退出，后端 exit 会再来一次 exited。
        // 这里做“UI 立即失败提示”：标为 failed（busy=false），避免一直转圈
        base.status = 'failed';
        base.stoppedAt = base.stoppedAt ?? Date.now();
        base.exitCode = base.exitCode ?? null;
        base.signal = base.signal ?? null;
        return base;

      default:
        return null;
    }
  }
  // private mapEventToStatus<K extends TaskEventType>(type: K, payload: TaskEventPayloadMap[K]): TaskRuntimeStatus | null {
  //   if (type === "snapshot" && (payload as TaskSnapshotPayload)?.status) {
  //     const { status, startedAt, stoppedAt, pid, exitCode, signal } = payload as TaskSnapshotPayload;
  //     return {
  //       status: status as TaskRuntimeStatus["status"],
  //       startedAt: startedAt,
  //       stoppedAt: stoppedAt,
  //       pid: pid,
  //       exitCode: exitCode,
  //       signal: signal,
  //     }
  //   }
  //   else if (type === "started") {
  //     const { pid, startedAt } = payload as TaskStartedPayload;
  //     return { status: "running", pid: pid, startedAt: startedAt }
  //   }
  //   else if (type === "stopRequested") return { status: "stopping" };
  //   else if (type === "exited") {
  //     const { exitCode, signal, stoppedAt } = payload as TaskExitedPayload;
  //     return { status: "stopped", exitCode, signal, stoppedAt }
  //   }
  //   else if (type === "failed") return { status: "stopped" };
  //   else if (type === "bootstrapDone" || type === "bootstrapFailed") {
  //     // 不变更状态
  //     return null;
  //   }
  //   return null;
  // }
}

