import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

import { HubWsManager } from "../modules/ws/ws.manager";
import { HubWsEvents } from "../modules/ws/ws.events";
import type { HubWsClientMessage } from "../modules/ws/ws.types";

function safeParseMessage(raw: string): HubWsClientMessage | null {
    try {
        return JSON.parse(raw) as HubWsClientMessage;
    } catch {
        return null;
    }
}

export default fp(async function wsPlugin(fastify: FastifyInstance) {
    await fastify.register(websocket);

    const wsManager = new HubWsManager();
    fastify.decorate("wsManager", wsManager);

    const hubWsEvents = new HubWsEvents(fastify);
    fastify.decorate("hubWsEvents", hubWsEvents);

    fastify.get("/ws", { websocket: true }, (socket, req) => {
        const client = wsManager.addClient(socket, {
            userId: "anonymous",
            role: "client",
        });

        wsManager.sendToClient(client.id, {
            id: randomUUID(),
            type: "system.connected",
            createdAt: new Date().toISOString(),
            payload: {
                clientId: client.id,
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
                    wsManager.subscribeProjects(client.id, msg.projectIds || []);
                    wsManager.sendToClient(client.id, {
                        id: randomUUID(),
                        type: "system.subscribed",
                        createdAt: new Date().toISOString(),
                        payload: {
                            projectIds: msg.projectIds || [],
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