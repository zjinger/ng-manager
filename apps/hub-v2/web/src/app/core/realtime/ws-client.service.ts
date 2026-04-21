import { DOCUMENT } from '@angular/common';
import { Injectable, Inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

import type { WsClientMessage, WsConnectionState, WsServerMessage } from './ws-message.types';

@Injectable({ providedIn: 'root' })
export class WsClientService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private shouldReconnect = false;

  private readonly connectionStateSignal = signal<WsConnectionState>('offline');
  readonly connectionState = this.connectionStateSignal.asReadonly();
  readonly messages$ = new Subject<WsServerMessage>();

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.shouldReconnect = true;
    this.connectionStateSignal.set(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.reconnectAttempt = 0;
    const current = this.socket;
    this.socket = null;
    this.connectionStateSignal.set('offline');
    if (current && current.readyState < WebSocket.CLOSING) {
      current.close(1000, 'client_disconnect');
    }
  }

  private openSocket(): void {
    const windowRef = this.document.defaultView;
    if (!windowRef) {
      this.connectionStateSignal.set('offline');
      return;
    }

    const protocol = windowRef.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${windowRef.location.host}/api/admin/ws`;
    const socket = new windowRef.WebSocket(socketUrl);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.connectionStateSignal.set('connected');
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) {
        return;
      }
      const message = this.parseMessage(event.data);
      if (!message) {
        return;
      }
      if (message.type === 'system.ping') {
        this.send({
          type: 'system.pong',
          ts: new Date().toISOString(),
        });
        return;
      }
      this.messages$.next(message);
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onclose = (event) => {
      if (this.socket === socket) {
        this.socket = null;
      }
      // 如果服务器主动断开连接，并且 reason 是 "forbidden"，则不再尝试重连，通常这是因为 JWT 验证失败导致的
      if (event.code === 1008 && event.reason === "forbidden") {
        this.shouldReconnect = false;
      }

      if (!this.shouldReconnect) {
        this.connectionStateSignal.set('offline');
        return;
      }
      this.scheduleReconnect();
    };
  }

  private parseMessage(data: unknown): WsServerMessage | null {
    if (typeof data !== 'string') {
      return null;
    }
    try {
      const parsed = JSON.parse(data) as WsServerMessage;
      if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private send(message: WsClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      this.socket.send(JSON.stringify(message));
    } catch {}
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.shouldReconnect) {
      return;
    }
    this.reconnectAttempt += 1;
    const baseDelay = Math.min(15_000, 1_000 * 2 ** Math.min(this.reconnectAttempt, 4));
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;
    this.connectionStateSignal.set('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
