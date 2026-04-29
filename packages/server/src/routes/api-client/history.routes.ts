import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";

type Scope = "global" | "project";

function parseScope(q: any): { scope: Scope; projectId?: string } {
    const scope = (q?.scope ?? "project") as Scope;
    const projectId = q?.projectId as string | undefined;
    if (scope === "project" && !projectId) throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
    return { scope, projectId };
}

function parseNum(v: any, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export async function apiClientHistoryRoutes(fastify: FastifyInstance) {
    const api = fastify.core.apiClient

    fastify.get("/", async (req) => {
        const { scope, projectId } = parseScope((req as any).query);
        const limit = parseNum((req as any).query?.limit, 50);
        const offset = parseNum((req as any).query?.offset, 0);

        return await api.listHistory({ scope, projectId, limit, offset });
    });

    fastify.post("/purge", async (req) => {
        const body = (req as any).body as {
            scope: Scope;
            projectId?: string;
            olderThan?: number;
            maxCount?: number;
        };

        const scope = body?.scope ?? "project";
        if (scope === "project" && !body.projectId) throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");

        const removed = await api.purgeHistory({
            scope,
            projectId: body.projectId,
            olderThan: body.olderThan,
            maxCount: body.maxCount,
        });

        return { removed };
    });
}
