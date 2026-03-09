import type { FastifyInstance } from "fastify";

export default async function adminWsRoutes(fastify: FastifyInstance) {
    fastify.get("/ws/stats", async () => {
        return {
            ok: true,
            data: fastify.wsManager.stats(),
        };
    });

    fastify.get("/ws/clients", async () => {
        return {
            ok: true,
            data: fastify.wsManager.listClients(),
        };
    });
}