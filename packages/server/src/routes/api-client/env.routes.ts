import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/core";
import type { FastifyInstance } from "fastify";

type Scope = "global" | "project";

function parseScope(q: any): { scope: Scope; projectId?: string } {
    const scope = (q?.scope ?? "project") as Scope;
    const projectId = q?.projectId as string | undefined;
    if (scope === "project" && !projectId) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
    }
    return { scope, projectId };
}

export async function apiClientEnvsRoutes(fastify: FastifyInstance) {
    const env = fastify.api

    fastify.get("/", async (req) => {
        const { scope, projectId } = parseScope((req as any).query);
        return await env.listEnvs(scope, projectId);
    });

    fastify.get("/:id", async (req, reply) => {
        const { scope, projectId } = parseScope((req as any).query);
        const id = (req as any).params.id as string;

        const item = await env.getEnv(id, scope, projectId);
        if (!item) {
            reply.code(404);
            return { message: "env not found", id };
        }
        return item;
    });

    fastify.post("/", async (req) => {
        const body = (req as any).body as {
            scope: Scope;
            projectId?: string;
            env: any;
        };

        const scope = body?.scope ?? "project";
        if (scope === "project" && !body.projectId) throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
        if (!body?.env?.id) throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "env.id is required");

        await env.saveEnv(body.env, scope, body.projectId);
        return { id: body.env.id };
    });

    fastify.delete("/:id", async (req) => {
        const { scope, projectId } = parseScope((req as any).query);
        const id = (req as any).params.id as string;

        await env.deleteEnv(id, scope, projectId);
        return { id };
    });
}