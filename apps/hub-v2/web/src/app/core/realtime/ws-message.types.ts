export type WsConnectionState = 'offline' | 'connecting' | 'connected' | 'reconnecting';
export type WsRefreshHint = 'notification' | 'badge' | 'dashboard';

export type WsServerMessage =
  | {
      type: 'server.hello';
      ts: string;
      payload: {
        connectionId: string;
      };
    }
  | {
      type: 'notification.changed';
      ts: string;
      projectId?: string;
      payload: {
        entityType: string;
        entityId: string;
        action: string;
        hints?: WsRefreshHint[];
        affectedUserIds?: string[];
      };
    }
  | {
      type: 'badge.changed';
      ts: string;
      projectId?: string;
      payload: {
        entityType: string;
        hints?: WsRefreshHint[];
      };
    }
  | {
      type: 'dashboard.changed';
      ts: string;
      projectId?: string;
      payload: {
        entityType: string;
        entityId?: string;
        action?: string;
        hints?: WsRefreshHint[];
      };
    }
  | {
      type: 'system.ping';
      ts: string;
    };

export type WsClientMessage =
  | {
      type: 'system.pong';
      ts?: string;
    };
