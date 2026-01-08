import { Injectable, NgZone } from "@angular/core";
import { BehaviorSubject, Observable, Subject, Subscription, timer } from "rxjs";
import { WsClientMsg, WsServerMsg } from "./ws.types";

type WsState = "idle" | "connecting" | "open" | "closed" | "error";

@Injectable({ providedIn: "root" })
export class WsClientService {
  private ws?: WebSocket;
  private readonly url = `ws://127.0.0.1:3210/ws`;
  private pending: WsClientMsg[] = [];

  private state$ = new BehaviorSubject<WsState>("idle");
  private inbound$ = new Subject<WsServerMsg>();

  private reconnectAttempt = 0;
  private manualClose = false;

  // 连接锁 + 可取消的重连订阅
  private opening = false;
  private reconnectSub?: Subscription;

  constructor(private zone: NgZone) { }

  getState(): Observable<WsState> {
    return this.state$.asObservable();
  }

  messages(): Observable<WsServerMsg> {
    return this.inbound$.asObservable();
  }

  connect() {
    // 已经 open/connecting/opening 就直接返回
    if (this.opening) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manualClose = false;
    this.open();
  }

  close() {
    this.manualClose = true;
    // 手动关闭时：取消重连、停心跳
    this.cancelReconnect();
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = undefined;
    this.opening = false;
    this.state$.next("closed");
  }

  send(obj: WsClientMsg) {
    console.log("[ws] send", obj);
    const data = JSON.stringify(obj);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.pending.push(obj);
    }
  }

  private open() {
    // open() 本身也要幂等，防止 timer 并发触发
    if (this.opening) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.opening = true;
    this.state$.next("connecting");

    // 每次真正开始连接前，先取消之前挂着的重连 timer
    this.cancelReconnect();

    this.zone.runOutsideAngular(() => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.opening = false;

        // 连接成功也再保险取消一次 pending reconnect
        this.cancelReconnect();
        // 发送 pending 消息
        const toSend = this.pending.splice(0);
        toSend.forEach(m => this.send(m));
        // 切换状态
        this.zone.run(() => this.state$.next("open"));
        // 启动心跳
        this.startHeartbeat();
      };

      ws.onmessage = (evt) => {
        let msg: any;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        this.zone.run(() => this.inbound$.next(msg));
      };

      ws.onerror = () => {
        // error 时通常会紧接 close，但不同环境不一致
        // 标记状态 + 主动 close 触发统一流程
        this.zone.run(() => this.state$.next("error"));
        try { ws.close(); } catch { }
      };

      ws.onclose = () => {
        // 统一清理
        this.opening = false;
        this.ws = undefined;
        this.stopHeartbeat();

        this.zone.run(() => this.state$.next("closed"));

        if (!this.manualClose) {
          this.scheduleReconnect();
        }
      };
    });
  }

  private heartbeatTimer?: any;

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ op: "ping" });
    }, 20_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private scheduleReconnect() {
    // 防止重复 schedule：如果已有重连订阅在跑，直接返回
    if (this.reconnectSub) return;

    this.reconnectAttempt++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 15_000);

    this.reconnectSub = timer(delay).subscribe(() => {
      this.reconnectSub = undefined;

      // 如果这段时间用户手动 close 了，就别再连
      if (this.manualClose) return;

      this.open();
    });
  }

  private cancelReconnect() {
    this.reconnectSub?.unsubscribe();
    this.reconnectSub = undefined;
  }
}

