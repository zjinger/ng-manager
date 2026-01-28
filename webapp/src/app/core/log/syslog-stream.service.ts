import { Injectable, signal } from "@angular/core";
import { filter } from "rxjs/operators";
import { Subscription } from "rxjs";

import { WsClientService } from "@app/core/ws/ws-client.service";
import type { WsServerMsg, WsState } from "@app/core/ws/ws.types";
import type { LogLine } from "@models/log.model";

export type SyslogFilter = {
    scope?: string;               // task / project / ws / server ...
    level?: LogLine["level"];
    source?: LogLine["source"];
    refId?: string;
};

function isSysTail(m: WsServerMsg): m is Extract<WsServerMsg, { op: "syslog.tail" }> {
    return m.op === "syslog.tail";
}

function isSysAppend(m: WsServerMsg): m is Extract<WsServerMsg, { op: "syslog.append" }> {
    return m.op === "syslog.append";
}

function match(entry: LogLine, f?: SyslogFilter): boolean {
    if (!f) return true;
    if (f.scope !== undefined && entry?.scope !== f.scope) return false;
    if (f.level !== undefined && entry?.level !== f.level) return false;
    if (f.source !== undefined && entry?.source !== f.source) return false;
    if (f.refId !== undefined && entry?.refId !== f.refId) return false;
    return true;
}

@Injectable({ providedIn: "root" })
export class SyslogStreamService {
    private msgSub?: Subscription;
    private wsStateSub?: Subscription;

    /** 是否已 enable（幂等开关） */
    readonly enabled = signal(false);

    /** 当前过滤器（scope 区分） */
    private filter = signal<SyslogFilter>({});

    /** 最新日志列表 */
    readonly logs = signal<LogLine[]>([]);

    /** 未读计数（drawer 关闭时累加） */
    readonly unread = signal<number>(0);

    /** drawer 是否打开（由组件控制） */
    readonly drawerOpen = signal<boolean>(false);

    /** 最大缓存行数 */
    private capacity = 2000;

    /** 订阅 tail（服务端下发 tail） */
    private tail = 300;

    /** 用于避免一次连接里重复发送 sub（open 时置 true，close 时置 false） */
    private subSentForCurrentConnection = false;

    /** 记录上一次 ws state，用于识别 open 边沿 */
    private lastWsState: WsState = "idle";

    constructor(private ws: WsClientService) {
        // 只订阅一次 ws messages
        this.msgSub = this.ws
            .messages()
            .pipe(filter((m) => isSysTail(m) || isSysAppend(m)))
            .subscribe((m) => this.onWsMessage(m));

        // 监听连接状态：open 时重放订阅（但只发一次）
        this.wsStateSub = this.ws.stateChanges().subscribe((s) => {
            const wasOpen = this.lastWsState === "open";
            const isOpen = s === "open";

            if (!wasOpen && isOpen) {
                // 新连接建立：允许发送一次 sub
                this.subSentForCurrentConnection = false;
                this.sendSubIfNeeded();
            }

            if (wasOpen && !isOpen) {
                // 连接断开：下次 open 需要重发
                this.subSentForCurrentConnection = false;
            }

            this.lastWsState = s;
        });
    }

    /** UI 控制 drawer 开关：打开时 unread 清零 */
    setDrawerOpen(open: boolean) {
        this.drawerOpen.set(open);
        if (open) this.unread.set(0);
    }

    /** 设置过滤器（例如：{ scope: "task" }） */
    setFilter(next: SyslogFilter) {
        this.filter.set(next ?? {});
        // filter 变更后，立刻在现有 logs 上应用一次（不强制 re-tail，避免抖动）
        const cur = this.logs();
        if (!cur.length) return;
        const filtered = cur.filter((x) => match(x, this.filter()));
        this.logs.set(filtered.slice(-this.capacity));
    }

    /** 幂等启用：多次调用不会重复 sub */
    enable(tail = 300) {
        const t = Math.max(0, Math.min(5000, tail | 0));
        this.tail = t;

        // 已启用：不重复发送 sub（避免 pending 堆积）
        if (this.enabled()) {
            // 如果 tail 变化，且当前连接 open，则可选择重新 sub 刷 tail
            // MVP：只在 open 状态下刷新一次，避免 pending 重复
            if (this.ws.isOpen()) {
                this.subSentForCurrentConnection = false;
                this.sendSubIfNeeded();
            }
            return;
        }

        this.enabled.set(true);

        // 确保连接（connect 幂等）
        this.ws.connect();

        // 如果此刻已经 open，立即 sub；否则等 state=open 时 sendSubIfNeeded
        this.sendSubIfNeeded();
    }

    /** 可选：停前端流（通常不建议 unsub syslog） */
    disable() {
        this.enabled.set(false);
        this.subSentForCurrentConnection = false;
        // 不主动 unsub，避免诊断日志停掉
        // this.ws.send({ op: "unsub", topic: "syslog" });
    }

    markRead() {
        this.unread.set(0);
    }

    clear() {
        this.logs.set([]);
        this.unread.set(0);
    }

    private sendSubIfNeeded() {
        if (!this.enabled()) return;
        if (!this.ws.isOpen()) return;
        if (this.subSentForCurrentConnection) return;

        this.ws.send({ op: "sub", topic: "syslog", tail: this.tail });
        this.subSentForCurrentConnection = true;
    }

    private onWsMessage(m: Extract<WsServerMsg, { op: "syslog.tail" | "syslog.append" }>) {
        const f = this.filter();

        if (m.op === "syslog.tail") {
            const entries = (m.entries ?? []).filter((x) => match(x, f));
            this.logs.set(entries.slice(-this.capacity));
            // tail 是历史，不算未读
            return;
        }

        // syslog.append
        const entry = m.entry;
        if (!match(entry, f)) return;

        const cur = this.logs();
        const next = cur.length >= this.capacity ? cur.slice(1) : cur.slice();
        next.push(entry);
        this.logs.set(next);

        if (!this.drawerOpen()) {
            this.unread.set(this.unread() + 1);
        }
    }
}
