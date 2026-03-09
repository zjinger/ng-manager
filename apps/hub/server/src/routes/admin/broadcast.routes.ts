import type { FastifyInstance } from "fastify";

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
            return reply.code(400).send({
                ok: false,
                code: "INVALID_TITLE",
                message: "title is required",
            });
        }

        if (!content) {
            return reply.code(400).send({
                ok: false,
                code: "INVALID_CONTENT",
                message: "content is required",
            });
        }

        fastify.hubWsEvents.broadcast({
            title,
            content,
            level,
            projectId,
        });

        return {
            ok: true,
            message: "broadcast sent",
            data: {
                title,
                content,
                level,
                projectId,
            },
        };
    });
}