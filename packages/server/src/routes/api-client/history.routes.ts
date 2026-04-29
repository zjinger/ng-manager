import type { ApiClient } from "@yinuo-ngm/api";
import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type {
    ApiScope,
    ListHistoryQueryDto,
    PurgeHistoryBodyDto,
    PurgeHistoryResultDto
} from "@yinuo-ngm/protocol";
import type { FastifyInstance } from "fastify";
import { toApiHistoryEntityDto } from "./route-mappers";

function parseScope(q: ListHistoryQueryDto): { scope: ApiScope; projectId?: string } {
    const scope = (q?.scope ?? "project") as ApiScope;
    const projectId = q?.projectId as string | undefined;
    if (scope === "project" && !projectId) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
    }
    return { scope, projectId };
}

function parseNum(v: unknown, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export async function apiClientHistoryRoutes(fastify: FastifyInstance) {
    const api = fastify.core.apiClient as ApiClient;

    fastify.get<{ Querystring: ListHistoryQueryDto }>(
        "/",
        async (req) => {
            const { scope, projectId } = parseScope(req.query);
            const limit = parseNum(req.query?.limit, 50);
            const offset = parseNum(req.query?.offset, 0);

            const items = await api.listHistory({ scope, projectId, limit, offset });
            return items.map(toApiHistoryEntityDto);
        }
    );

    fastify.post<{ Body: PurgeHistoryBodyDto }>(
        "/purge",
        async (req) => {
            const body = req.body as PurgeHistoryBodyDto;
            const scope = body?.scope ?? "project";
            if (scope === "project" && !body.projectId) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
            }

            const removed = await api.purgeHistory({
                scope,
                projectId: body.projectId,
                olderThan: body.olderThan,
                maxCount: body.maxCount,
            });

            return { removed } as PurgeHistoryResultDto;
        }
    );
}
