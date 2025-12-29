import { Injectable, NgZone } from "@angular/core";
import { BehaviorSubject, Observable, Subject, timer } from "rxjs";

type WsState = "idle" | "connecting" | "open" | "closed" | "error";

@Injectable({ providedIn: "root" })
export class WsClientService {
  private ws?: WebSocket;
  private readonly url = `ws://127.0.0.1:3210/ws`;

  private state$ = new BehaviorSubject<WsState>("idle");
  private inbound$ = new Subject<any>();

  private reconnectAttempt = 0;
  private manualClose = false;

  constructor(private zone: NgZone) { }

  getState(): Observable<WsState> {
    return this.state$.asObservable();
  }

  messages(): Observable<any> {
    return this.inbound$.asObservable();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manualClose = false;
    this.open();
  }

  close() {
    this.manualClose = true;
    this.ws?.close();
  }

  send(obj: any) {
    const data = JSON.stringify(obj);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  private open() {
    this.state$.next("connecting");

    // 在 Angular zone 外跑，避免频繁 message 触发变更检测
    this.zone.runOutsideAngular(() => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.zone.run(() => this.state$.next("open"));
        this.startHeartbeat();
      };

      ws.onmessage = (evt) => {
        let msg: any;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        // 回到 zone 内再发给订阅者
        this.zone.run(() => this.inbound$.next(msg));
      };

      ws.onerror = () => {
        this.zone.run(() => this.state$.next("error"));
      };

      ws.onclose = () => {
        this.zone.run(() => this.state$.next("closed"));
        if (!this.manualClose) this.scheduleReconnect();
      };
    });
  }

  private heartbeatTimer?: any;

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ op: "ping" });
    }, 10_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempt++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 15_000);
    timer(delay).subscribe(() => this.open());
  }
}
