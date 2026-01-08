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

  private opening = false;
  private reconnectSub?: Subscription;

  constructor(private zone: NgZone) { }

  /** 给外部监听连接状态 */
  stateChanges(): Observable<WsState> {
    return this.state$.asObservable();
  }

  messages(): Observable<WsServerMsg> {
    return this.inbound$.asObservable();
  }

  connect() {
    if (this.opening) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.manualClose = false;
    this.open();
  }

  close() {
    this.manualClose = true;
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
    if (this.opening) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.opening = true;
    this.state$.next("connecting");

    this.cancelReconnect();

    this.zone.runOutsideAngular(() => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.opening = false;

        this.cancelReconnect();

        const toSend = this.pending.splice(0);
        toSend.forEach((m) => this.send(m));

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
        this.zone.run(() => this.inbound$.next(msg));
      };

      ws.onerror = () => {
        this.zone.run(() => this.state$.next("error"));
        try {
          ws.close();
        } catch { }
      };

      ws.onclose = () => {
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
    if (this.reconnectSub) return;

    this.reconnectAttempt++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 15_000);

    this.reconnectSub = timer(delay).subscribe(() => {
      this.reconnectSub = undefined;
      if (this.manualClose) return;
      this.open();
    });
  }

  private cancelReconnect() {
    this.reconnectSub?.unsubscribe();
    this.reconnectSub = undefined;
  }
}
