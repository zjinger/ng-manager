import { Injectable } from "@angular/core";
import { WsClientService } from "@app/core/ws/ws-client.service";
import { WsClientMsg, WsServerMsg, WsState } from "@core/ws";
import type { TaskEventMsg, TaskEventType, TaskOutputMsg, TaskRuntimeStatus } from "@models/task.model";
import { Subject } from "rxjs";
import { TaskRuntimeStore } from "./task-runtime-store";

type SubEntry = {
  ref: number;      // 引用计数
  tail: number;     // 当前要求的 tail（“最大值”策略，避免丢日志）
};

@Injectable({ providedIn: "root" })
export class TaskStreamService {
  private outputByRun = new Map<string, Subject<TaskOutputMsg>>();
  private event$ = new Subject<TaskEventMsg>();

  private subs = new Map<string, SubEntry>(); // runId -> {ref, tail}
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

  /** 多消费者订阅：ref++，tail 取最大 */
  subscribeRun(runId: string, tail = 200) {
    const id = String(runId ?? "").trim();
    if (!id) return;

    const t = Number.isFinite(tail) ? Math.max(0, Math.min(5000, Math.floor(tail))) : 0;

    const cur = this.subs.get(id);
    if (!cur) {
      this.subs.set(id, { ref: 1, tail: t });
      if (this.ws.isOpen()) {
        this.ws.send({ op: "sub", topic: "task", runId: id, tail: t } as WsClientMsg);
      }
      return;
    }

    // 已存在：ref++；tail 取 max（避免某个消费者 tail 小把另一个的 tail 覆盖）
    const nextTail = Math.max(cur.tail, t);
    this.subs.set(id, { ref: cur.ref + 1, tail: nextTail });

    // tail 变大时，需要重新 sub 一次（服务端会 snapshot + tail logs）
    if (this.ws.isOpen() && nextTail !== cur.tail) {
      this.ws.send({ op: "sub", topic: "task", runId: id, tail: nextTail } as WsClientMsg);
    }
  }

  /** 多消费者退订：ref--，到 0 才真正 unsub */
  unsubscribeRun(runId: string) {
    const id = String(runId ?? "").trim();
    if (!id) return;

    const cur = this.subs.get(id);
    if (!cur) return;

    const ref = cur.ref - 1;
    if (ref > 0) {
      this.subs.set(id, { ref, tail: cur.tail });
      return;
    }

    // ref==0：真正退订
    this.subs.delete(id);
    if (this.ws.isOpen()) {
      this.ws.send({ op: "unsub", topic: "task", runId: id } as WsClientMsg);
    }
    // 释放 output subject（防止 Map 无限长）
    const out = this.outputByRun.get(id);
    if (out) {
      out.complete();
      this.outputByRun.delete(id);
    }
    // runtimeStore 是否清理：建议由“exited/failed”事件统一清理（更准确）
  }

  resize(runId: string, cols: number, rows: number) {
    const id = String(runId ?? "").trim();
    if (!id) return;
    // 仅 open 发送，避免 pending 堆积 resize
    if (!this.ws.isOpen()) return;
    this.ws.send({ op: "resize", topic: "task", runId: id, cols, rows } as WsClientMsg);
  }

  output$(runId: string) {
    return this.ensureOutput(runId).asObservable();
  }

  events$() {
    return this.event$.asObservable();
  }

  status$(runId: string) {
    return this.runtimeStore.status$(runId);
  }

  private replaySubs() {
    for (const [runId, entry] of this.subs.entries()) {
      this.ws.send({ op: "sub", topic: "task", runId, tail: entry.tail } as WsClientMsg);
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

    if (op === "task.event") {
      const runId = String(msg.runId ?? "").trim();
      if (!runId) return;

      const type = String((msg as any).type ?? "") as TaskEventType;
      const payload = (msg as any).payload;
      const ts = typeof (msg as any).ts === "number" ? (msg as any).ts : Date.now();

      // 事件先发出去（StateService 用它维护 taskId -> runId）
      this.event$.next({ runId, type, payload, ts } as TaskEventMsg);

      // 再落 store（你后面会把 payload 强类型化）
      const next = this.mapEventToStatus(type, payload);
      if (next) this.runtimeStore.set(runId, next);

      if (type === "failed") {
        const errText = `[failed] ${payload?.error ?? ""}`.trim();
        if (errText) {
          this.ensureOutput(runId).next({ runId, stream: "stderr", chunk: errText + "\n", ts: Date.now() });
        }
      }
    }
  }

  private ensureOutput(runId: string) {
    const id = String(runId ?? "").trim();
    if (!this.outputByRun.has(id)) this.outputByRun.set(id, new Subject<TaskOutputMsg>());
    return this.outputByRun.get(id)!;
  }

  private mapEventToStatus(type: TaskEventType, payload: any): TaskRuntimeStatus | null {
    if (type === "snapshot" && payload?.status) return { status: payload.status };
    if (type === "started") return { status: "running", pid: payload?.pid, startedAt: payload?.startedAt };
    if (type === "stopRequested") return { status: "stopping" };
    if (type === "exited") return { status: "stopped", exitCode: payload?.exitCode, signal: payload?.signal, stoppedAt: payload?.stoppedAt };
    if (type === "failed") return { status: "stopped" };
    return null;
  }
}
