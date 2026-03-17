import type WebSocket from "ws";

export type HubWsEventType =
    | "system.connected"
    | "system.subscribed"
    | "pong"
    | "announcement.published"
    | "announcement.updated"
    | "doc.published"
    | "doc.updated"
    | "release.created"
    | "issue.created"
    | "issue.updated"
    | "broadcast";

export interface HubWsEvent<T = unknown> {
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
