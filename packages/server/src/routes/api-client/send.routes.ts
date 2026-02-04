import type { FastifyInstance } from "fastify";

type Scope = "global" | "project";

export async function apiClientSendRoutes(fastify: FastifyInstance) {
    const api = fastify.api
    fastify.post("/", async (req) => {
        const body = (req as any).body as {
            scope?: Scope;
            projectId?: string;
            requestId?: string;
            request?: any;
            envId?: string;
            projectRoot?: string;
        };

        const scope = body.scope ?? "project";
        if (scope === "project" && !body.projectId) throw new Error("projectId is required when scope=project");
        if (!body.request && !body.requestId) throw new Error("request or requestId is required");

        return await api.send({
            scope,
            projectId: body.projectId,
            requestId: body.requestId,
            request: body.request,
            envId: body.envId,
            projectRoot: body.projectRoot,
        });
    });
}
