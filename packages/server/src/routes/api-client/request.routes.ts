import type { FastifyInstance } from "fastify";

type Scope = "global" | "project";

function parseScope(q: any): { scope: Scope; projectId?: string } {
    const scope = (q?.scope ?? "project") as Scope;
    const projectId = q?.projectId as string | undefined;
    if (scope === "project" && !projectId) {
        // project scope 必须有 projectId
        throw new Error("projectId is required when scope=project");
    }
    return { scope, projectId };
}

export async function apiClientRequestsRoutes(fastify: FastifyInstance) {
    const api = fastify.api

    fastify.get("/", async (req) => {
        const { scope, projectId } = parseScope((req as any).query);
        const items = await api.listRequests(scope, projectId);
        return items;
    });

    fastify.get("/:id", async (req, reply) => {
        const { scope, projectId } = parseScope((req as any).query);
        const id = (req as any).params.id as string;

        const item = await api.getRequest(id, scope, projectId);
        if (!item) {
            reply.code(404);
            return { message: "request not found", id };
        }
        return item;
    });

    fastify.post("/", async (req) => {
        const body = (req as any).body as {
            scope: Scope;
            projectId?: string;
            request: any;
        };

        const scope = body?.scope ?? "project";
        if (scope === "project" && !body.projectId) throw new Error("projectId is required when scope=project");
        if (!body?.request?.id) throw new Error("request.id is required");
        await api.saveRequest(body.request, scope, body.projectId);
        return { id: body.request.id };
    });

    fastify.post("/update", async (req) => {
        const body = (req as any).body as {
            scope: Scope;
            projectId?: string;
            request: any;
        };
        const scope = body?.scope ?? "project";
        if (scope === "project" && !body.projectId) throw new Error("projectId is required when scope=project");
        if (!body?.request?.id) throw new Error("request.id is required");
        const old = await api.getRequest(body.request.id, scope, body.projectId);
        if (!old) throw new Error("request not found: " + body.request.id);
        const updated = {
            ...old,
            ...body.request,
        };
        await api.saveRequest(updated, scope, body.projectId);
        return { id: body.request.id };
    });

    fastify.delete("/:id", async (req) => {
        const { scope, projectId } = parseScope((req as any).query);
        const id = (req as any).params.id as string;
        await api.deleteRequest(id, scope, projectId);
        return { id };
    });
}