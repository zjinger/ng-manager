export type WsConnectionState = "connected" | "reconnecting" | "offline";

export type WsServerMessage =
  | {
      type: "server.hello";
      ts: string;
      payload: {
        connectionId: string;
      };
    }
  | {
      type: "notification.changed";
      ts: string;
      projectId?: string;
      payload: {
        entityType: string;
        entityId: string;
        action: string;
      };
    }
  | {
      type: "badge.changed";
      ts: string;
      projectId?: string;
      payload: {
        entityType: string;
      };
    }
  | {
      type: "system.ping";
      ts: string;
    };

export type WsClientMessage =
  | {
      type: "system.pong";
      ts?: string;
    }
  | {
      type: "subscribe.project";
      projectId?: string | null;
    };
