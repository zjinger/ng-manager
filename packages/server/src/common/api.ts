import type { FastifyReply, FastifyRequest } from "fastify";

export function ok<T>(req: FastifyRequest, reply: FastifyReply, data: T, status = 200) {
    return reply.status(status).send({
        ok: true as const,
        data,
        meta: {
            requestId: req.id,
            ts: Date.now(),
        },
    });
}
