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
      type: 'notification.new';
      ts: string;
      projectId?: string;
      payload: {
        notificationId: string;
        unreadCount: number;
        notification: {
          id: string;
          kind: 'todo' | 'activity';
          category:
            | 'issue_todo'
            | 'issue_mention'
            | 'issue_activity'
            | 'rd_todo'
            | 'rd_activity'
            | 'announcement'
            | 'document'
            | 'release'
            | 'project_member';
          title: string;
          description: string;
          sourceLabel: string;
          projectName: string;
          time: string;
          route: string;
          unread: boolean;
          projectId: string | null;
        };
        entityType: string;
        entityId: string;
        action: string;
      };
    }
  | {
      type: 'notification.unread';
      ts: string;
      payload: {
        unreadCount: number;
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
