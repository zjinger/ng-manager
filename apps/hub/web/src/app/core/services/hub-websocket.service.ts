import { DestroyRef, Inject, Injectable, InjectionToken, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { HubApiService } from '../http/hub-api.service';
import { AdminAuthService } from './admin-auth.service';

export type HubWsServerEventType =
  | 'system.connected'
  | 'system.subscribed'
  | 'pong'
  | 'announcement.published'
  | 'announcement.updated'
  | 'doc.published'
  | 'doc.updated'
  | 'release.created'
  | 'issue.created'
  | 'issue.updated'
  | 'rd.created'
  | 'rd.updated'
  | 'broadcast';

export type HubWsEventType = HubWsServerEventType | 'system.message';

export interface HubWsEvent<T = unknown> {
  id: string;
  type: HubWsEventType;
  projectId?: string | null;
  createdAt: string;
  payload: T;
  message: string;
}

export const HUB_WS_URL = new InjectionToken<string>('HUB_WS_URL');

@Injectable({ providedIn: 'root' })
export class HubWebsocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private subscribedProjectIds: string[] = [];
  private shouldReconnect = false;
  private readonly resolvedWsUrl: string;
  private readonly eventsSubject = new Subject<HubWsEvent>();

  public readonly events$ = this.eventsSubject.asObservable();
  public readonly connected = signal(false);

  public constructor(
    @Inject(HUB_WS_URL) wsUrl: string,
    private readonly api: HubApiService,
    private readonly auth: AdminAuthService,
    destroyRef: DestroyRef
  ) {
    this.resolvedWsUrl = this.resolveWsUrl(wsUrl);

    destroyRef.onDestroy(() => {
      this.shouldReconnect = false;
      this.dispose();
    });
  }

  public async refreshProjectSubscriptions(): Promise<void> {
    if (!this.auth.profile()) {
      this.setProjectSubscriptions([]);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.api.get<{ items: Array<{ id: string }> }>('/api/admin/projects', {
          params: { page: 1, pageSize: 200 }
        })
      );
      this.setProjectSubscriptions(result.items.map((item) => item.id));
    } catch {
      this.setProjectSubscriptions([]);
    }
  }

  public ensureConnected(): void {
    if (!this.auth.profile()) {
      return;
    }

    this.shouldReconnect = true;
    this.connect();
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    this.dispose();
  }

  public setProjectSubscriptions(projectIds: string[]): void {
    this.subscribedProjectIds = Array.from(
      new Set((projectIds || []).map((item) => String(item).trim()).filter(Boolean))
    );

    if (this.connected()) {
      this.send({ type: 'subscribe.projects', projectIds: this.subscribedProjectIds });
    }
  }

  private connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.clearReconnectTimer();
    this.socket = new WebSocket(this.resolvedWsUrl);

    this.socket.onopen = () => {
      this.connected.set(true);
      this.startHeartbeat();
      if (this.subscribedProjectIds.length > 0) {
        this.send({ type: 'subscribe.projects', projectIds: this.subscribedProjectIds });
      }
    };

    this.socket.onmessage = (event) => {
      this.eventsSubject.next(this.parseMessage(event.data));
    };

    this.socket.onclose = () => {
      this.connected.set(false);
      this.stopHeartbeat();
      this.socket = null;
      if (this.shouldReconnect && this.auth.profile()) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      this.connected.set(false);
    };
  }

  private send(payload: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.socket.send(JSON.stringify(payload));
    } catch {
      // ignore send failures and rely on reconnect handling
    }
  }

  private parseMessage(rawData: unknown): HubWsEvent {
    const now = new Date().toISOString();
    if (typeof rawData !== 'string') {
      return {
        id: `local-${Date.now()}`,
        type: 'system.message',
        createdAt: now,
        payload: { rawData },
        message: '收到非文本 websocket 消息'
      };
    }

    try {
      const parsed = JSON.parse(rawData) as Partial<HubWsEvent> & { type?: string; payload?: unknown };
      if (!this.isWsPayload(parsed)) {
        return {
          id: `local-${Date.now()}`,
          type: 'system.message',
          createdAt: now,
          payload: { rawData },
          message: rawData
        };
      }

      return {
        id: parsed.id,
        type: parsed.type,
        projectId: parsed.projectId ?? null,
        createdAt: parsed.createdAt,
        payload: parsed.payload,
        message: this.describeEvent(parsed.type, parsed.payload)
      };
    } catch {
      return {
        id: `local-${Date.now()}`,
        type: 'system.message',
        createdAt: now,
        payload: { rawData },
        message: rawData
      };
    }
  }

  private describeEvent(type: HubWsEventType, payload: unknown): string {
    const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
    const title = typeof data['title'] === 'string' ? data['title'] : '';
    const issueNo = typeof data['issueNo'] === 'string' ? data['issueNo'] : '';
    const version = typeof data['version'] === 'string' ? data['version'] : '';
    const content = typeof data['content'] === 'string' ? data['content'] : '';
    const action = typeof data['action'] === 'string' ? data['action'] : '';

    switch (type) {
      case 'announcement.published':
        return title ? `公告已发布：${title}` : '有新公告发布';
      case 'announcement.updated':
        return title ? `公告已更新：${title}` : '公告内容已更新';
      case 'doc.published':
        return title ? `文档已发布：${title}` : '有文档发布';
      case 'doc.updated':
        return title ? `文档已更新：${title}` : '文档内容已更新';
      case 'release.created':
        return version ? `新版本已发布：${version}` : '有新版本发布';
      case 'issue.created':
        return title ? `新事项已创建：${issueNo || title}` : '有新事项创建';
      case 'issue.updated':
        return title ? `事项已更新：${issueNo || title}${action ? ` · ${action}` : ''}` : '事项状态已更新';
      case 'rd.created':
        return title ? `新研发项已创建：${title}` : '有新研发项创建';
      case 'rd.updated':
        return title ? `研发项已更新：${title}${action ? ` · ${action}` : ''}` : '研发项状态已更新';
      case 'broadcast':
        return [title, content].filter(Boolean).join('：') || '收到系统广播';
      case 'system.connected':
        return 'websocket 已连接';
      case 'system.subscribed':
        return '已同步项目订阅';
      case 'pong':
        return 'pong';
      default:
        return '收到系统消息';
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
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
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected.set(false);
  }

  private isWsPayload(value: unknown): value is {
    id: string;
    type: HubWsServerEventType;
    projectId?: string | null;
    createdAt: string;
    payload: unknown;
  } {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const maybe = value as {
      id?: unknown;
      type?: unknown;
      projectId?: unknown;
      createdAt?: unknown;
      payload?: unknown;
    };

    const validType =
      maybe.type === 'system.connected' ||
      maybe.type === 'system.subscribed' ||
      maybe.type === 'pong' ||
      maybe.type === 'announcement.published' ||
      maybe.type === 'announcement.updated' ||
      maybe.type === 'doc.published' ||
      maybe.type === 'doc.updated' ||
      maybe.type === 'release.created' ||
      maybe.type === 'issue.created' ||
      maybe.type === 'issue.updated' ||
      maybe.type === 'rd.created' ||
      maybe.type === 'rd.updated' ||
      maybe.type === 'broadcast';

    return (
      validType &&
      typeof maybe.id === 'string' &&
      typeof maybe.createdAt === 'string' &&
      'payload' in maybe
    );
  }

  private resolveWsUrl(value: string): string {
    if (value.startsWith('ws://') || value.startsWith('wss://')) {
      return value;
    }

    if (typeof window === 'undefined') {
      return value;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = `${protocol}//${window.location.host}`;
    return new URL(value, base).toString();
  }
}
