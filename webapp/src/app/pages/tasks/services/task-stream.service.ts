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

  private subs = new Map<string, { tail: number; refs: number }>(); // taskId -> sub state
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

  subscribeTask(taskId: string, tail = 200, opts?: { replay?: boolean }) {
    const id = taskId.trim();
    if (!id) return;
    const t = Math.max(0, Math.min(5000, tail | 0));
    const prev = this.subs.get(id);
    const replay = !!opts?.replay;
    if (!prev) {
      this.subs.set(id, { tail: t, refs: 1 });
      if (this.ws.isOpen()) {
        this.ws.send({ op: "sub", topic: "task", taskId: id, tail: t });
      }
      return;
    }

    const nextTail = Math.max(prev.tail, t);
    this.subs.set(id, { tail: nextTail, refs: prev.refs + 1 });
    if (this.ws.isOpen() && (nextTail !== prev.tail || replay)) {
      this.ws.send({ op: "sub", topic: "task", taskId: id, tail: nextTail });
    }
  }

  unsubscribeTask(taskId: string) {
    const id = taskId.trim();
    const prev = this.subs.get(id);
    if (!prev) return;

    const nextRefs = prev.refs - 1;
    if (nextRefs > 0) {
      this.subs.set(id, { ...prev, refs: nextRefs });
      return;
    }

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
    for (const [taskId, state] of this.subs.entries()) {
      this.ws.send({ op: "sub", topic: "task", taskId, tail: state.tail } as WsClientMsg);
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
    const prev = this.runtimeStore.runtimeSignal(taskId)();
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
        const wasStopping = base.status === 'stopping';
        base.exitCode = (payload as TaskExitedPayload)?.exitCode ?? null;
        base.signal = (payload as TaskExitedPayload)?.signal ?? null;
        if (wasStopping) {
          // 用户主动 stop 场景优先按 stopped 处理，避免把 Ctrl+C/非0退出码误判为 failed
          base.status = 'stopped';
        } else if (base.signal) {
          base.status = 'stopped';
        } else if (base.exitCode === 0) {
          base.status = 'success';
        } else if (base.exitCode == null) {
          base.status = 'stopped';
        } else {
          base.status = 'failed';
        }
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
}

