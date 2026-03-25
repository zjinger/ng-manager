import { nanoid } from "nanoid";
import type { RequestContext } from "../context/request-context";
import type { WsServerMessage } from "./ws.types";

export type WsClientAuth = {
  accountId: string;
  userId: string | null;
  roles: string[];
  projectIds: string[];
};

type WsLikeSocket = {
  readyState: number;
  send(data: string): void;
  close(code?: number, data?: string): void;
  ping?(): void;
  on(event: "close", listener: () => void): void;
  on(event: "error", listener: (error: unknown) => void): void;
  on(event: "pong", listener: () => void): void;
};

export type WsClientSession = {
  id: string;
  socket: WsLikeSocket;
  auth: WsClientAuth;
  requestContext: RequestContext;
  subscribedProjectId: string | null;
  lastPongAt: number;
};

type WsHubOptions = {
  pingIntervalMs?: number;
  pongTimeoutMs?: number;
};

export class WsHub {
  private readonly sessions = new Map<string, WsClientSession>();
  private readonly pingIntervalMs: number;
  private readonly pongTimeoutMs: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(options: WsHubOptions = {}) {
    this.pingIntervalMs = options.pingIntervalMs ?? 20_000;
    this.pongTimeoutMs = options.pongTimeoutMs ?? 45_000;
  }

  addClient(socket: WsLikeSocket, auth: WsClientAuth, requestContext: RequestContext): WsClientSession {
    const session: WsClientSession = {
      id: `ws_${nanoid(16)}`,
      socket,
      auth,
      requestContext,
      subscribedProjectId: null,
      lastPongAt: Date.now()
    };

    this.sessions.set(session.id, session);
    this.ensureHeartbeat();

    socket.on("close", () => {
      this.removeClient(session.id);
    });

    socket.on("error", () => {
      this.removeClient(session.id);
    });

    socket.on("pong", () => {
      this.touchPong(session.id);
    });

    return session;
  }

  removeClient(sessionId: string): void {
    this.sessions.delete(sessionId);
    if (this.sessions.size === 0) {
      this.stopHeartbeat();
    }
  }

  closeAll(): void {
    for (const session of this.sessions.values()) {
      try {
        session.socket.close(1001, "server_shutdown");
      } catch {}
    }
    this.sessions.clear();
    this.stopHeartbeat();
  }

  touchPong(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.lastPongAt = Date.now();
  }

  setSubscribedProject(sessionId: string, projectId: string | null): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.subscribedProjectId = projectId;
  }

  broadcast(message: WsServerMessage): void {
    for (const session of this.sessions.values()) {
      this.send(session, message);
    }
  }

  broadcastToProject(projectId: string, message: WsServerMessage): void {
    for (const session of this.sessions.values()) {
      if (!this.hasProjectAccess(session, projectId)) {
        continue;
      }
      if (session.subscribedProjectId && session.subscribedProjectId !== projectId) {
        continue;
      }
      this.send(session, message);
    }
  }

  broadcastToAccessibleProjects(projectIds: string[], message: WsServerMessage): void {
    const projectSet = new Set(projectIds);
    for (const session of this.sessions.values()) {
      const hasAccess =
        session.auth.roles.includes("admin") ||
        session.auth.projectIds.some((projectId) => projectSet.has(projectId));
      if (!hasAccess) {
        continue;
      }
      if (session.subscribedProjectId && !projectSet.has(session.subscribedProjectId)) {
        continue;
      }
      this.send(session, message);
    }
  }

  private send(session: WsClientSession, message: WsServerMessage): void {
    if (session.socket.readyState !== 1) {
      return;
    }
    try {
      session.socket.send(JSON.stringify(message));
    } catch {
      this.removeClient(session.id);
    }
  }

  private hasProjectAccess(session: WsClientSession, projectId: string): boolean {
    return session.auth.roles.includes("admin") || session.auth.projectIds.includes(projectId);
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const session of this.sessions.values()) {
        if (now - session.lastPongAt > this.pongTimeoutMs) {
          try {
            session.socket.close(1001, "pong_timeout");
          } catch {}
          this.removeClient(session.id);
          continue;
        }
        try {
          if (session.socket.ping) {
            session.socket.ping();
          } else {
            this.send(session, {
              type: "system.ping",
              ts: new Date().toISOString()
            });
          }
        } catch {
          this.removeClient(session.id);
        }
      }
    }, this.pingIntervalMs);
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatTimer) {
      return;
    }
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}
