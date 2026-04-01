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
  lastPongAt: number;
};

type WsHubOptions = {
  pingIntervalMs?: number;
  pongTimeoutMs?: number;
};

export class WsHub {
  private readonly sessions = new Map<string, WsClientSession>();
  private readonly userSessions = new Map<string, Set<string>>();
  private readonly pingIntervalMs: number;
  private readonly pongTimeoutMs: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(options: WsHubOptions = {}) {
    this.pingIntervalMs = options.pingIntervalMs ?? 20_000;
    this.pongTimeoutMs = options.pongTimeoutMs ?? 60_000;
  }

  addClient(socket: WsLikeSocket, auth: WsClientAuth, requestContext: RequestContext): WsClientSession {
    const session: WsClientSession = {
      id: `ws_${nanoid(16)}`,
      socket,
      auth,
      requestContext,
      lastPongAt: Date.now()
    };

    this.sessions.set(session.id, session);
    this.addUserSession(session);
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
    const session = this.sessions.get(sessionId);
    if (session) {
      this.removeUserSession(session);
    }
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
    this.userSessions.clear();
    this.stopHeartbeat();
  }

  touchPong(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.lastPongAt = Date.now();
  }

  broadcast(message: WsServerMessage): void {
    for (const session of this.sessions.values()) {
      this.send(session, message);
    }
  }

  broadcastToUsers(userIds: string[], message: WsServerMessage): void {
    const uniqueUserIds = new Set(userIds.map((id) => id.trim()).filter(Boolean));
    for (const userId of uniqueUserIds) {
      const sessionIds = this.userSessions.get(userId);
      if (!sessionIds || sessionIds.size === 0) {
        continue;
      }
      for (const sessionId of sessionIds) {
        const session = this.sessions.get(sessionId);
        if (!session) {
          continue;
        }
        this.send(session, message);
      }
    }
  }

  broadcastToProjectMembers(projectId: string, message: WsServerMessage): void {
    for (const session of this.sessions.values()) {
      if (!this.hasProjectAccess(session, projectId)) {
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
    return session.auth.projectIds.includes(projectId);
  }

  private resolveUserId(session: WsClientSession): string {
    return session.auth.userId?.trim() || session.auth.accountId;
  }

  private addUserSession(session: WsClientSession): void {
    const userId = this.resolveUserId(session);
    const sessionIds = this.userSessions.get(userId);
    if (sessionIds) {
      sessionIds.add(session.id);
      return;
    }
    this.userSessions.set(userId, new Set([session.id]));
  }

  private removeUserSession(session: WsClientSession): void {
    const userId = this.resolveUserId(session);
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return;
    }
    sessionIds.delete(session.id);
    if (sessionIds.size === 0) {
      this.userSessions.delete(userId);
    }
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
            session.socket.close(1001, "timeout");
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
