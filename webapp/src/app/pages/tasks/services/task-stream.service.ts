import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { WsClientService } from "@app/core/ws/ws-client.service";
import { TaskConsoleLine, TaskRuntimeStatus } from "@models/task.model";
@Injectable({ providedIn: "root" })
export class TaskStreamService {
  private linesByTask = new Map<string, BehaviorSubject<TaskConsoleLine[]>>();
  private statusByTask = new Map<string, BehaviorSubject<TaskRuntimeStatus>>();

  constructor(private ws: WsClientService) {
    this.ws.messages().subscribe((msg) => this.onMessage(msg));
  }

  ensureConnected() {
    this.ws.connect();
  }

  subscribeTask(taskId: string, tail = 200) {
    this.ws.send({ op: "sub", topic: "task", taskId, tail });
  }

  unsubscribeTask(taskId: string) {
    this.ws.send({ op: "unsub", topic: "task", taskId });
  }

  lines$(taskId: string) {
    if (!this.linesByTask.has(taskId)) this.linesByTask.set(taskId, new BehaviorSubject<TaskConsoleLine[]>([]));
    return this.linesByTask.get(taskId)!.asObservable();
  }

  status$(taskId: string) {
    if (!this.statusByTask.has(taskId)) this.statusByTask.set(taskId, new BehaviorSubject<TaskRuntimeStatus>({ status: "idle" }));
    return this.statusByTask.get(taskId)!.asObservable();
  }

  clear(taskId: string) {
    this.linesByTask.get(taskId)?.next([]);
  }

  private onMessage(msg: any) {
    if (msg?.op === "log") {
      const taskId = msg.taskId;
      const entry = msg.entry;

      const text = typeof entry?.text === "string" ? entry.text : String(entry?.text ?? entry ?? "");
      const line: TaskConsoleLine = {
        ts: entry?.ts,
        text,
        level: entry?.level,
        stream: entry?.stream,
      };

      const subject = this.ensureLines(taskId);
      subject.next([...subject.value, line].slice(-5000)); // 控制最大行数，避免页面卡死
      return;
    }

    if (msg?.op === "status") {
      const taskId = msg.taskId;
      const event = msg.event;
      const payload = msg.payload;

      const subject = this.ensureStatus(taskId);

      // snapshot 是订阅后服务端主动推一次的状态
      if (event === "snapshot") {
        // 你 status API 返回的结构：{ status, pid, startedAt, exitCode... }
        if (payload?.status === "running") {
          subject.next({ status: "running", pid: payload.pid, startedAt: payload.startedAt });
        } else if (payload?.status === "stopped") {
          subject.next({ status: "stopped", exitCode: payload.exitCode, signal: payload.signal, stoppedAt: payload.stoppedAt });
        }
        return;
      }

      // 根据 core Events 表映射
      if (event === "task.started") {
        subject.next({ status: "running", pid: payload?.pid });
        return;
      }
      if (event === "task.exited") {
        subject.next({ status: "stopped", exitCode: payload?.exitCode, signal: payload?.signal });
        return;
      }
      if (event === "task.failed") {
        subject.next({ status: "stopped" });
        // 失败信息也写到日志里
        const lines = this.ensureLines(taskId);
        lines.next([...lines.value, { text: `[failed] ${payload?.error ?? ""}` }]);
        return;
      }
      if (event === "task.stopped") {
        subject.next({ status: "stopped" });
        return;
      }
    }
  }

  private ensureLines(taskId: string) {
    if (!this.linesByTask.has(taskId)) this.linesByTask.set(taskId, new BehaviorSubject<TaskConsoleLine[]>([]));
    return this.linesByTask.get(taskId)!;
  }

  private ensureStatus(taskId: string) {
    if (!this.statusByTask.has(taskId)) this.statusByTask.set(taskId, new BehaviorSubject<TaskRuntimeStatus>({ status: "idle" }));
    return this.statusByTask.get(taskId)!;
  }
}
