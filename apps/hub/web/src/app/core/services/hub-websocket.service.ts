import { DestroyRef, Inject, Injectable, InjectionToken, signal } from '@angular/core';
import { Subject } from 'rxjs';

export type HubWsEventType =
  | 'feedback.created'
  | 'announcement.created'
  | 'release.published'
  | 'system.message';

export interface HubWsEvent {
  type: HubWsEventType;
  message: string;
  timestamp: string;
}

export const HUB_WS_URL = new InjectionToken<string>('HUB_WS_URL');

@Injectable({ providedIn: 'root' })
export class HubWebsocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly eventsSubject = new Subject<HubWsEvent>();

  public readonly events$ = this.eventsSubject.asObservable();
  public readonly connected = signal(false);

  public constructor(
    @Inject(HUB_WS_URL) private readonly wsUrl: string,
    destroyRef: DestroyRef
  ) {
    // this.connect();
    destroyRef.onDestroy(() => this.dispose());
  }

  private connect(): void {
    this.clearReconnectTimer();
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      this.connected.set(true);
    };

    this.socket.onmessage = (event) => {
      this.eventsSubject.next(this.parseMessage(event.data));
    };

    this.socket.onclose = () => {
      this.connected.set(false);
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.connected.set(false);
    };
  }

  private parseMessage(rawData: unknown): HubWsEvent {
    const now = new Date().toISOString();
    if (typeof rawData !== 'string') {
      return { type: 'system.message', message: '收到非文本消息', timestamp: now };
    }

    try {
      const parsed: unknown = JSON.parse(rawData);
      if (this.isWsPayload(parsed)) {
        return {
          type: parsed.type,
          message: parsed.message,
          timestamp: parsed.timestamp ?? now
        };
      }
      return { type: 'system.message', message: rawData, timestamp: now };
    } catch {
      return { type: 'system.message', message: rawData, timestamp: now };
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private dispose(): void {
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
  }

  private isWsPayload(
    value: unknown
  ): value is { type: HubWsEventType; message: string; timestamp?: string } {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const maybe = value as { type?: unknown; message?: unknown; timestamp?: unknown };
    const validType =
      maybe.type === 'feedback.created' ||
      maybe.type === 'announcement.created' ||
      maybe.type === 'release.published' ||
      maybe.type === 'system.message';
    return validType && typeof maybe.message === 'string';
  }
}
