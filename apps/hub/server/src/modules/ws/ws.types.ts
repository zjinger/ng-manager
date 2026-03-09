import type WebSocket from "ws";

export type HubWsEventType =
    | "system.connected" // 客户端连接成功
    | "system.subscribed" // 客户端订阅了项目
    | "pong" // 心跳响应
    | "announcement.published" // 公告发布
    | "announcement.updated" // 公告更新
    | "doc.published" // 文档发布
    | "doc.updated" // 文档更新
    | "release.created" // 版本发布
    | "broadcast"; // 管理员广播消息

export interface HubWsEvent<T = any> {
    id: string;
    type: HubWsEventType;
    projectId?: string | null;
    createdAt: string;
    payload: T;
}

export interface HubWsClient {
    id: string;
    socket: WebSocket;
    userId?: string;
    role?: string;
    projectIds: Set<string>;
    connectedAt: number;
    lastPingAt: number;
}

export interface WsSubscribeProjectsMessage {
    type: "subscribe.projects";
    projectIds: string[];
}

export interface WsPingMessage {
    type: "ping";
}

export type HubWsClientMessage =
    | WsSubscribeProjectsMessage
    | WsPingMessage;