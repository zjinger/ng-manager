import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

import { HubWsManager } from "../modules/ws/ws.manager";
import { HubWsEvents } from "../modules/ws/ws.events";
import type { HubWsClient, HubWsClientMessage } from "../modules/ws/ws.types";
import type { JwtAdminPayload } from "../modules/auth/auth.types";

function safeParseMessage(raw: string): HubWsClientMessage | null {
    try {
        return JSON.parse(raw) as HubWsClientMessage;
    } catch {
        return null;
    }
}

async function authenticateSocket(fastify: FastifyInstance, request: any) {
    await request.jwtVerify();
    const payload = request.user as JwtAdminPayload | undefined;
    if (!payload?.sub) {
        throw new Error("unauthorized");
    }

    const profile = fastify.services.auth.getProfileById(payload.sub);
    request.adminUser = profile;
    return profile;
}

function filterProjectIds(fastify: FastifyInstance, client: HubWsClient, projectIds: string[]): string[] {
    const normalized = Array.from(
        new Set((projectIds || []).map((item) => String(item).trim()).filter(Boolean))
    );

    if (normalized.length === 0) {
        return [];
    }

    if (client.role === "admin") {
        return normalized;
    }

    if (!client.userId) {
        return [];
    }

    const allowed = new Set(fastify.services.projectMember.listProjectIdsByUserId(client.userId));
    return normalized.filter((projectId) => allowed.has(projectId));
}

export default fp(async function wsPlugin(fastify: FastifyInstance) {
    await fastify.register(websocket);

    const wsManager = new HubWsManager();
    fastify.decorate("wsManager", wsManager);

    const hubWsEvents = new HubWsEvents(fastify);
    fastify.decorate("hubWsEvents", hubWsEvents);

    fastify.get("/ws", { websocket: true }, async (socket, request) => {
        let profile;
        try {
            profile = await authenticateSocket(fastify, request);
        } catch {
            socket.close(4401, "unauthorized");
            return;
        }

        const client = wsManager.addClient(socket, {
            userId: profile.userId?.trim() || profile.id,
            role: profile.role,
        });

        wsManager.sendToClient(client.id, {
            id: randomUUID(),
            type: "system.connected",
            createdAt: new Date().toISOString(),
            payload: {
                clientId: client.id,
                userId: client.userId ?? null,
                role: client.role ?? null,
            },
        });

        socket.on("message", (raw) => {
            const msg = safeParseMessage(raw.toString());
            if (!msg) return;

            switch (msg.type) {
                case "ping": {
                    wsManager.touch(client.id);
                    wsManager.sendToClient(client.id, {
                        id: randomUUID(),
                        type: "pong",
                        createdAt: new Date().toISOString(),
                        payload: {},
                    });
                    break;
                }

                case "subscribe.projects": {
                    const allowedProjectIds = filterProjectIds(fastify, client, msg.projectIds || []);
                    wsManager.subscribeProjects(client.id, allowedProjectIds);
                    wsManager.sendToClient(client.id, {
                        id: randomUUID(),
                        type: "system.subscribed",
                        createdAt: new Date().toISOString(),
                        payload: {
                            projectIds: allowedProjectIds,
                        },
                    });
                    break;
                }

                default:
                    break;
            }
        });

        socket.on("close", () => {
            wsManager.removeClient(client.id);
        });

        socket.on("error", () => {
            wsManager.removeClient(client.id);
        });
    });
});

