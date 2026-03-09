import type { FastifyInstance } from "fastify";
import { fail, ok } from "../../utils/response";

type BroadcastBody = {
    title: string;
    content: string;
    level?: "info" | "success" | "warning" | "error";
    projectId?: string | null;
};

export default async function adminBroadcastRoutes(fastify: FastifyInstance) {
    fastify.post("/broadcast", async (req, reply) => {
        const body = req.body as BroadcastBody;

        const title = String(body?.title ?? "").trim();
        const content = String(body?.content ?? "").trim();
        const level = body?.level ?? "info";
        const projectId = body?.projectId ? String(body.projectId).trim() : null;

        if (!title) {
            return reply.code(400).send(fail("INVALID_TITLE", "title is required"));
        }

        if (!content) {
            return reply.code(400).send(fail("INVALID_CONTENT", "content is required"));
        }

        fastify.hubWsEvents.broadcast({
            title,
            content,
            level,
            projectId,
        });

        return ok(
            {
                title,
                content,
                level,
                projectId,
            },
            "broadcast sent"
        );
    });
}