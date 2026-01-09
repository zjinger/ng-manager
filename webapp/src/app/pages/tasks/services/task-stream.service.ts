import { Injectable } from "@angular/core";
import { WsClientService } from "@app/core/ws/ws-client.service";
import { WsClientMsg, WsServerMsg, WsState } from "@core/ws";
import type { TaskEventMsg, TaskEventType, TaskOutputMsg, TaskRuntimeStatus } from "@models/task.model";
import { Subject } from "rxjs";
import { TaskRuntimeStore } from "./task-runtime-store";
/**
 * 输出流 + 事件流 + 写入 store
 * 收到 WS task.event 时，直接落地到 runtimeStore（单源）
 */
@Injectable({ providedIn: "root" })
export class TaskStreamService {
  private outputByRun = new Map<string, Subject<TaskOutputMsg>>();
  private event$ = new Subject<TaskEventMsg>();

  // 断线重连后的订阅重放：runId -> tail
  private subs = new Map<string, number>();
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

  subscribeRun(runId: string, tail = 200) {
    const id = String(runId ?? "").trim();
    if (!id) return;

    const t = Number.isFinite(tail)
      ? Math.max(0, Math.min(5000, Math.floor(tail)))
      : 0;
    // 幂等：已订阅且 tail 相同 -> 不做任何事（关键）
    const prev = this.subs.get(id);
    if (prev === t) return;
    // 用于断线重连重放
    this.subs.set(id, t);
    // 只在 open 时才真正发送，避免进入 ws.pending 造成重复
    if (this.ws.isOpen()) {
      this.ws.send({ op: "sub", topic: "task", runId: id, tail: t } as WsClientMsg);
    }
  }

  unsubscribeRun(runId: string) {
    const id = String(runId ?? "").trim();
    if (!id) return;
    // 幂等：没订阅过就不发 unsub
    if (!this.subs.has(id)) return;
    this.subs.delete(id);
    if (this.ws.isOpen()) {
      this.ws.send({ op: "unsub", topic: "task", runId: id } as WsClientMsg);
    }
  }

  resize(runId: string, cols: number, rows: number) {
    const id = String(runId ?? "").trim();
    if (!id) return;
    this.ws.send({ op: "resize", topic: "task", runId: id, cols, rows } as WsClientMsg);
  }

  /** 给 Console 用：输出 chunk stream */
  output$(runId: string) {
    return this.ensureOutput(runId).asObservable();
  }

  /** 给 State 用：事件流 */
  events$() {
    return this.event$.asObservable();
  }
  /** 运行态单源 */
  status$(runId: string) {
    return this.runtimeStore.status$(runId);
  }

  /**
   * 断线重连后，重放订阅
   */
  private replaySubs() {
    for (const [runId, tail] of this.subs.entries()) {
      this.ws.send({ op: "sub", topic: "task", runId, tail } as WsClientMsg);
    }
  }

  private onMessage(msg: WsServerMsg) {
    const op = msg?.op;
    if (op === "task.output") {
      const runId = String(msg.runId ?? "").trim();
      if (!runId) return;

      const chunk = typeof msg.chunk === "string" ? msg.chunk : String(msg.chunk ?? "");
      const stream = msg.stream === "stderr" ? "stderr" : "stdout";
      const ts = typeof msg.ts === "number" ? msg.ts : Date.now();

      this.ensureOutput(runId).next({ runId, stream, chunk, ts });
      return;
    }
    //  task.event
    if (op === "task.event") {
      const runId = String(msg.runId ?? "").trim();
      if (!runId) return;

      const type = String(msg.type ?? "") as TaskEventType;
      const payload = msg.payload;
      const ts = typeof msg.ts === "number" ? msg.ts : Date.now();

      // 先发事件（给 State 维护 taskId->runId 等）
      this.event$.next({ runId, type, payload, ts });

      // 再写入运行态 store
      const next = this.mapEventToStatus(type, payload);
      if (next) this.runtimeStore.set(runId, next);

      // failed：额外打一条 stderr 到输出
      if (type === "failed") {
        const errText = `[failed] ${payload?.error ?? ""}`.trim();
        if (errText) {
          this.ensureOutput(runId).next({
            runId,
            stream: "stderr",
            chunk: errText + "\n",
            ts: Date.now(),
          });
        }
      }
      return;
    }
  }

  private ensureOutput(runId: string) {
    const id = String(runId ?? "").trim();
    if (!this.outputByRun.has(id)) this.outputByRun.set(id, new Subject<TaskOutputMsg>());
    return this.outputByRun.get(id)!;
  }

  private mapEventToStatus(
    type: TaskEventType,
    payload: any
  ): TaskRuntimeStatus | null {
    if (type === "snapshot") {
      if (payload?.status === "running") {
        return { status: "running", pid: payload?.pid, startedAt: payload?.startedAt };
      }
      if (payload?.status === "stopping") {
        return { status: "stopping" };
      }
      if (payload?.status === "stopped" || payload?.status === "failed" || payload?.status === "success") {
        return {
          status: "stopped",
          exitCode: payload?.exitCode,
          signal: payload?.signal,
          stoppedAt: payload?.stoppedAt,
        };
      }
      return { status: "idle" };
    }

    if (type === "started") {
      return { status: "running", pid: payload?.pid, startedAt: payload?.startedAt };
    }

    if (type === "stopRequested") {
      return { status: "stopping" };
    }

    if (type === "exited") {
      return {
        status: "stopped",
        exitCode: payload?.exitCode,
        signal: payload?.signal,
        stoppedAt: payload?.stoppedAt,
      };
    }

    if (type === "failed") {
      return { status: "stopped" };
    }

    return null;
  }
}
