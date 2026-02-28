import { DestroyRef, Injectable } from "@angular/core";
import { WsClientMsg, WsServerMsg, WsState } from "@app/core/ws";
import { WsClientService } from "@app/core/ws/ws-client.service";
import type {
  SvnEventMsg,
  SvnEventType,
  SvnSyncDonePayload,
  SvnSyncFailedPayload,
  SvnSyncOutputPayload,
  SvnSyncProgressPayload,
  SvnSyncRuntimePayload,
  SvnSyncStartedPayload,
  SvnTaskStatus,
} from "@core/ws/ws.svn.types";
import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

/**
 * UI 侧运行态（基于 SvnSyncRuntimePayload 扩展一些便于展示的字段）
 */
export type SvnRuntimeVM = SvnSyncRuntimePayload & {
  status?: SvnTaskStatus;

  // progress snapshot
  total?: number;
  changed?: number;
  percent?: number;

  // timestamps
  updatedAt?: string;   // 来自 done/failed
  lastEventAt?: number; // 本地接收时间戳

  // error snapshot
  lastError?: string;
};

type SvnOutputChunk = {
  projectId: string;
  sourceId: string;
  stream: "stdout" | "stderr";
  text: string;
  status: SvnTaskStatus;
  ts: number;
};

@Injectable({ providedIn: "root" })
export class SpriteStreamService {
  private subs = new Map<string, number>(); // projectId -> tail
  private lastWsState: WsState = "idle";

  private event$ = new Subject<SvnEventMsg>();
  private eventByProject = new Map<string, Subject<SvnEventMsg>>();

  private runtimesByProject = new Map<string, BehaviorSubject<SvnRuntimeVM[]>>();

  // projectId:sourceId -> output stream
  private outputByKey = new Map<string, Subject<SvnOutputChunk>>();

  constructor(
    private ws: WsClientService
  ) {
    this.ws.messages().subscribe((msg) => this.onMessage(msg));
    this.ws.stateChanges().subscribe((s) => {
      if (s === "open" && this.lastWsState !== "open") this.replaySubs();
      this.lastWsState = s;
    });
  }

  // ------------------------
  // connection + trigger
  // ------------------------

  ensureConnected() {
    this.ws.connect();
  }

  // ------------------------
  // subscribe lifecycle
  // ------------------------

  subscribeProject(projectId: string, tail = 1000) {
    const id = String(projectId ?? "").trim();
    if (!id) return;

    const t = Math.max(0, Math.min(5000, tail | 0));
    if (this.subs.get(id) === t) return;

    this.subs.set(id, t);
    this.ensureProjectEventSubject(id);
    this.ensureProjectRuntimesSubject(id);

    if (this.ws.isOpen()) {
      this.ws.send({ op: "sub", topic: "svn", projectId: id, tail: t } as Extract<WsClientMsg, { op: "sub" }>);
    }
  }

  unsubscribeProject(projectId: string) {
    const id = String(projectId ?? "").trim();
    if (!this.subs.has(id)) return;

    this.subs.delete(id);

    if (this.ws.isOpen()) {
      this.ws.send({ op: "unsub", topic: "svn", projectId: id } as Extract<WsClientMsg, { op: "unsub" }>);
    }
  }

  /**
   * 推荐：组件 add 进自己的 Subscription 容器
   * - sub.unsubscribe() 时自动触发 unsubscribeProject()
   */
  watchProject(projectId: string, tail = 1000): Subscription {
    const id = String(projectId ?? "").trim();
    this.ensureConnected();
    this.subscribeProject(id, tail);

    const sub = new Subscription();
    sub.add(() => this.unsubscribeProject(id));
    return sub;
  }

  /**
   * 更自动：绑定到 DestroyRef（Angular 16+）
   */
  bindToDestroyRef(projectId: string, destroyRef: DestroyRef, tail = 1000) {
    const id = String(projectId ?? "").trim();
    this.ensureConnected();
    this.subscribeProject(id, tail);
    destroyRef.onDestroy(() => this.unsubscribeProject(id));
  }

  // ------------------------
  // streams
  // ------------------------

  events$() {
    return this.event$.asObservable();
  }

  eventsByProject$(projectId: string) {
    const id = String(projectId ?? "").trim();
    return this.ensureProjectEventSubject(id).asObservable();
  }

  runtimes$(projectId: string): Observable<SvnRuntimeVM[]> {
    const id = String(projectId ?? "").trim();
    return this.ensureProjectRuntimesSubject(id).asObservable().pipe(distinctUntilChanged());
  }

  /**
   * 输出流：按 (projectId, sourceId)
   * - payload.output: { type, data, status }
   */
  output$(projectId: string) {
    const key = this.keyOf(projectId);
    if (!this.outputByKey.has(key)) this.outputByKey.set(key, new Subject<SvnOutputChunk>());
    return this.outputByKey.get(key)!.asObservable();
  }

  // ------------------------
  // internals
  // ------------------------

  private replaySubs() {
    for (const [projectId, tail] of this.subs.entries()) {
      this.ws.send({ op: "sub", topic: "svn", projectId, tail } as WsClientMsg);
    }
  }

  private onMessage(msg: WsServerMsg) {
    if (msg?.op !== "svn.event") return;

    const m = msg as SvnEventMsg;
    const type = m.type as SvnEventType;
    const payload: any = m.payload;

    const projectId = String(payload?.projectId ?? "").trim();
    if (!projectId) return;

    // 全局 & 分项目事件
    this.event$.next(m);
    this.ensureProjectEventSubject(projectId).next(m);

    // 更新 runtime / output
    this.applyEvent(type, payload, m.ts ?? Date.now());
  }

  private applyEvent(type: SvnEventType, payload: any, ts: number) {
    const projectId = String(payload?.projectId ?? "").trim();
    const sourceId = String(payload?.sourceId ?? "").trim();
    if (!projectId || !sourceId) return;

    switch (type) {
      case "runtime": {
        const rt = payload as SvnSyncRuntimePayload;
        this.upsert(projectId, sourceId, (prev) => ({
          ...prev,
          ...rt,
          lastEventAt: ts,
        }), true);
        return;
      }

      case "started": {
        const p = payload as SvnSyncStartedPayload;
        this.upsert(projectId, sourceId, (prev) => ({
          ...prev,
          status: p.status,
          lastEventAt: ts,
          // started 时通常还没有 url/mode，保留 prev
        }));
        return;
      }

      case "output": {
        const p = payload as SvnSyncOutputPayload;
        const stream = p.type; // stdout | stderr
        const text = String(p.data ?? "");

        // 1) 推输出流
        if (text) {
          const key = this.keyOf(projectId);
          if (!this.outputByKey.has(key)) this.outputByKey.set(key, new Subject<SvnOutputChunk>());
          this.outputByKey.get(key)!.next({
            projectId,
            sourceId,
            stream,
            text,
            status: p.status,
            ts,
          });
        }

        // 2) 也写回 runtime 快照（MVP：只存最后一段）
        this.upsert(projectId, sourceId, (prev) => ({
          ...prev,
          status: p.status,
          lastEventAt: ts,
          lastStdout: stream === "stdout" ? text : prev.lastStdout,
          lastStderr: stream === "stderr" ? text : prev.lastStderr,
        }));
        return;
      }

      case "progress": {
        const p = payload as SvnSyncProgressPayload;
        this.upsert(projectId, sourceId, (prev) => ({
          ...prev,
          status: p.status,
          lastEventAt: ts,
          total: p.total ?? prev.total,
          changed: p.changed ?? prev.changed,
          percent: p.percent ?? prev.percent,
        }));
        return;
      }

      case "done": {
        const p = payload as SvnSyncDonePayload;
        this.upsert(projectId, sourceId, (prev) => ({
          ...prev,
          status: p.status,
          lastEventAt: ts,
          updatedAt: p.updatedAt,

          // 把本次同步的关键信息写回 runtime
          lastSyncAt: p.updatedAt,         // 你 runtime 里叫 lastSyncAt
          lastSyncMode: p.mode,
          desiredUrl: p.desiredUrl,
          currentUrl: p.currentUrl,
        }));
        return;
      }

      case "failed": {
        const p = payload as SvnSyncFailedPayload;
        this.upsert(projectId, sourceId, (prev) => ({
          ...prev,
          status: p.status,
          lastEventAt: ts,
          updatedAt: p.updatedAt,
          lastError: p.error,

          // 失败一般也希望 stderr 有一条提示，方便 aside/面板直接展示
          lastStderr: p.error ? `[failed] ${p.error}` : prev.lastStderr,
        }));

        // 同时推一条 stderr 到 output 流（对齐你 task failed 的做法）
        if (p.error) {
          const key = this.keyOf(projectId);
          if (!this.outputByKey.has(key)) this.outputByKey.set(key, new Subject<SvnOutputChunk>());
          this.outputByKey.get(key)!.next({
            projectId,
            sourceId,
            stream: "stderr",
            text: `[failed] ${p.error}\n`,
            status: p.status,
            ts,
          });
        }
        return;
      }

      default:
        return;
    }
  }

  /** upsert by (projectId, sourceId) */
  private upsert(
    projectId: string,
    sourceId: string,
    patcher: (prev: SvnRuntimeVM) => SvnRuntimeVM,
    preferIncoming = false
  ) {
    const $rt = this.ensureProjectRuntimesSubject(projectId);
    const prevList = $rt.value ?? [];
    const idx = prevList.findIndex((x) => x.projectId === projectId && x.sourceId === sourceId);

    const base: SvnRuntimeVM =
      idx >= 0 ? prevList[idx] : ({ projectId, sourceId } as SvnRuntimeVM);

    const patched = patcher(base);
    const nextOne = preferIncoming ? { ...base, ...patched } : patched;

    const next = prevList.slice();
    if (idx >= 0) next[idx] = nextOne;
    else next.unshift(nextOne);

    $rt.next(next.slice(0, 200));
  }

  private ensureProjectEventSubject(projectId: string) {
    const id = String(projectId ?? "").trim();
    if (!this.eventByProject.has(id)) this.eventByProject.set(id, new Subject<SvnEventMsg>());
    return this.eventByProject.get(id)!;
  }

  private ensureProjectRuntimesSubject(projectId: string) {
    const id = String(projectId ?? "").trim();
    if (!this.runtimesByProject.has(id)) this.runtimesByProject.set(id, new BehaviorSubject<SvnRuntimeVM[]>([]));
    return this.runtimesByProject.get(id)!;
  }

  private keyOf(projectId: string) {
    return `svn:${projectId}`;
  }
}