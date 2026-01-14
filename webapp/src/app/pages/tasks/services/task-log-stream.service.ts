import { Injectable, signal } from "@angular/core";
import { filter } from "rxjs/operators";
import { Subscription } from "rxjs";
import { WsClientService, WsServerMsg } from "@app/core";
import { LogLine } from "@models/log.model";

function isSysTail(m: WsServerMsg): m is Extract<WsServerMsg, { op: "syslog.tail" }> {
  return m.op === "syslog.tail";
}

function isSysAppend(m: WsServerMsg): m is Extract<WsServerMsg, { op: "syslog.append" }> {
  return m.op === "syslog.append";
}

function isTaskScope(entry: LogLine): boolean {
  return entry?.scope === "task";
}

@Injectable({ providedIn: "root" })
export class TaskLogStreamService {
  private sub?: Subscription;

  readonly logs = signal<LogLine[]>([]);
  readonly unread = signal<number>(0);
  readonly enabled = signal<boolean>(false);

  // 由 UI 控制 drawer 状态，解决 unread 一直涨的问题
  readonly drawerOpen = signal<boolean>(false);

  private capacity = 2000;

  constructor(private ws: WsClientService) { }

  setDrawerOpen(open: boolean) {
    this.drawerOpen.set(open);
    if (open) this.unread.set(0);
  }

  enable(tail = 300) {
    // 幂等：避免重复订阅
    if (this.sub) this.disable();
    this.enabled.set(true);
    this.ws.send({ op: "sub", topic: "syslog", tail });

    this.sub = this.ws
      .messages()
      .pipe(
        filter((m) => isSysTail(m) || isSysAppend(m))
      )
      .subscribe((m) => {
        if (isSysTail(m)) {
          const entries = (m.entries ?? []).filter(isTaskScope);
          this.logs.set(entries.slice(-this.capacity));
          return;
        }

        // append
        const entry = m.entry;
        if (!isTaskScope(entry)) return;

        const cur = this.logs();
        const next = cur.length >= this.capacity ? cur.slice(1) : cur.slice();
        next.push(entry);
        this.logs.set(next);

        if (!this.drawerOpen()) {
          this.unread.set(this.unread() + 1);
        }
      });
  }

  markRead() {
    this.unread.set(0);
  }

  clear() {
    this.logs.set([]);
    this.unread.set(0);
  }

  disable() {
    this.enabled.set(false);
    // 诊断日志一般不建议 unsub；只停前端监听即可
    // this.ws.send({ op: "unsub", topic: "syslog" });
    this.sub?.unsubscribe();
    this.sub = undefined;
  }
}
