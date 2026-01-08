import { Injectable } from "@angular/core";
import { WsClientService } from "@app/core/ws/ws-client.service";
import { WsState } from "@core/ws";
import type { TaskRuntimeStatus } from "@models/task.model";
import { BehaviorSubject, Subject } from "rxjs";

export type TaskOutputMsg = {
  runId: string;
  stream: "stdout" | "stderr";
  chunk: string;
  ts: number;
};

@Injectable({ providedIn: "root" })
export class TaskStreamService {
  // runId -> output subject（chunk stream）
  private outputByRun = new Map<string, Subject<TaskOutputMsg>>();
  // runId -> status subject（state store）
  private statusByRun = new Map<string, BehaviorSubject<TaskRuntimeStatus>>();

  // 断线重连后的订阅重放：runId -> tail
  private subs = new Map<string, number>();
  private lastWsState: WsState = "idle";

  constructor(private ws: WsClientService) {
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
    const id = (runId ?? "").trim();
    if (!id) return;

    const t = Number.isFinite(tail) ? Math.max(0, Math.min(5000, Math.floor(tail))) : 0;
    this.subs.set(id, t);

    // sub topic=task runId tail
    this.ws.send({ op: "sub", topic: "task", runId: id, tail: t } as any);
  }

  unsubscribeRun(runId: string) {
    const id = (runId ?? "").trim();
    if (!id) return;

    this.subs.delete(id);
    this.ws.send({ op: "unsub", topic: "task", runId: id } as any);
  }

  /** 给 Console 用：输出 chunk stream */
  output$(runId: string) {
    return this.ensureOutput(runId).asObservable();
  }

  /** 给 Console/ActionBar 用：运行状态 */
  status$(runId: string) {
    return this.ensureStatus(runId).asObservable();
  }

  private replaySubs() {
    for (const [runId, tail] of this.subs.entries()) {
      this.ws.send({ op: "sub", topic: "task", runId, tail } as any);
    }
  }

  private onMessage(msg: any) {
    //  task.output
    if (msg?.op === "task.output") {
      const runId = String(msg.runId ?? "").trim();
      if (!runId) return;

      const chunk = typeof msg.chunk === "string" ? msg.chunk : String(msg.chunk ?? "");
      const stream = msg.stream === "stderr" ? "stderr" : "stdout";
      const ts = typeof msg.ts === "number" ? msg.ts : Date.now();

      this.ensureOutput(runId).next({ runId, stream, chunk, ts });
      return;
    }

    //  task.event
    if (msg?.op === "task.event") {
      const runId = String(msg.runId ?? "").trim();
      if (!runId) return;

      const type = String(msg.type ?? "");
      const payload = msg.payload;

      const st = this.ensureStatus(runId);

      if (type === "snapshot") {
        if (payload?.status === "running") {
          st.next({ status: "running", pid: payload?.pid, startedAt: payload?.startedAt });
        } else if (payload?.status === "stopping") {
          st.next({ status: "stopping" } as any);
        } else if (payload?.status === "stopped") {
          st.next({
            status: "stopped",
            exitCode: payload?.exitCode,
            signal: payload?.signal,
            stoppedAt: payload?.stoppedAt,
          });
        }
        return;
      }

      if (type === "started") {
        st.next({ status: "running", pid: payload?.pid, startedAt: payload?.startedAt });
        return;
      }

      if (type === "stopRequested") {
        st.next({ status: "stopping" } as any);
        return;
      }

      if (type === "exited") {
        st.next({
          status: "stopped",
          exitCode: payload?.exitCode,
          signal: payload?.signal,
          stoppedAt: payload?.stoppedAt,
        });
        return;
      }

      if (type === "failed") {
        st.next({ status: "stopped" });
        const errText = `[failed] ${payload?.error ?? ""}`.trim();
        if (errText) {
          this.ensureOutput(runId).next({
            runId,
            stream: "stderr",
            chunk: errText + "\n",
            ts: Date.now(),
          });
        }
        return;
      }
    }
  }

  private ensureOutput(runId: string) {
    const id = (runId ?? "").trim();
    if (!this.outputByRun.has(id)) this.outputByRun.set(id, new Subject<TaskOutputMsg>());
    return this.outputByRun.get(id)!;
  }

  private ensureStatus(runId: string) {
    const id = (runId ?? "").trim();
    if (!this.statusByRun.has(id)) this.statusByRun.set(id, new BehaviorSubject<TaskRuntimeStatus>({ status: "idle" }));
    return this.statusByRun.get(id)!;
  }
}
