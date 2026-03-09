import type { FastifyInstance } from "fastify";
import { ok } from "../../utils/response";

export default async function adminWsRoutes(fastify: FastifyInstance) {
    fastify.get("/ws/stats", async () => {
        return ok(fastify.wsManager.stats());
    });

    fastify.get("/ws/clients", async () => {
        return ok(fastify.wsManager.listClients());
    });
}