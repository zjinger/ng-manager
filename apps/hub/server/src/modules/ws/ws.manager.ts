import { randomUUID } from "node:crypto";
import type WebSocket from "ws";
import type { HubWsClient, HubWsEvent } from "./ws.types";

export class HubWsManager {
    private clients = new Map<string, HubWsClient>();

    addClient(
        socket: WebSocket,
        meta?: Partial<Omit<HubWsClient, "id" | "socket" | "projectIds" | "connectedAt" | "lastPingAt">>
    ): HubWsClient {
        const client: HubWsClient = {
            id: randomUUID(),
            socket,
            userId: meta?.userId,
            role: meta?.role,
            projectIds: new Set<string>(),
            connectedAt: Date.now(),
            lastPingAt: Date.now(),
        };

        this.clients.set(client.id, client);
        return client;
    }

    removeClient(clientId: string): void {
        this.clients.delete(clientId);
    }

    touch(clientId: string): void {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastPingAt = Date.now();
        }
    }

    subscribeProjects(clientId: string, projectIds: string[]): void {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.projectIds = new Set(
            (projectIds || []).map(v => String(v).trim()).filter(Boolean)
        );
    }

    sendToClient(clientId: string, event: HubWsEvent): boolean {
        const client = this.clients.get(clientId);
        if (!client) return false;
        return this.sendSocket(client.socket, event);
    }

    broadcast(event: HubWsEvent): number {
        let count = 0;
        for (const client of this.clients.values()) {
            if (this.sendSocket(client.socket, event)) {
                count++;
            }
        }
        return count;
    }

    broadcastToProject(projectId: string, event: HubWsEvent): number {
        let count = 0;
        for (const client of this.clients.values()) {
            if (!client.projectIds.has(projectId)) continue;
            if (this.sendSocket(client.socket, event)) {
                count++;
            }
        }
        return count;
    }

    listClients() {
        return Array.from(this.clients.values()).map(client => ({
            id: client.id,
            userId: client.userId ?? null,
            role: client.role ?? null,
            projectIds: Array.from(client.projectIds),
            connectedAt: client.connectedAt,
            lastPingAt: client.lastPingAt,
        }));
    }

    stats() {
        return {
            total: this.clients.size,
            clients: this.listClients(),
        };
    }

    private sendSocket(socket: WebSocket, event: HubWsEvent): boolean {
        if (socket.readyState !== 1) return false;

        try {
            socket.send(JSON.stringify(event));
            return true;
        } catch {
            return false;
        }
    }
}