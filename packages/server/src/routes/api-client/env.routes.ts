import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";
import type {
    ApiScope,
    ListEnvsQueryDto,
    SaveEnvBodyDto,
    EnvIdParamDto,
    ApiEnvironmentEntityDto,
} from "@yinuo-ngm/protocol";
import type { ApiClient } from "@yinuo-ngm/api";
import { toApiEnvironmentEntityDto } from "./route-mappers";

function parseScope(q: ListEnvsQueryDto): { scope: ApiScope; projectId?: string } {
    const scope = (q?.scope ?? "project") as ApiScope;
    const projectId = q?.projectId as string | undefined;
    if (scope === "project" && !projectId) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
    }
    return { scope, projectId };
}

export async function apiClientEnvsRoutes(fastify: FastifyInstance) {
    const api = fastify.core.apiClient as ApiClient;

    fastify.get<{ Querystring: ListEnvsQueryDto }>(
        "/",
        async (req) => {
            const { scope, projectId } = parseScope(req.query);
            const items = await api.listEnvs(scope, projectId);
            return items.map(toApiEnvironmentEntityDto);
        }
    );

    fastify.get<{ Querystring: ListEnvsQueryDto; Params: EnvIdParamDto }>(
        "/:id",
        async (req, reply) => {
            const { scope, projectId } = parseScope(req.query);
            const id = req.params.id;

            const item = await api.getEnv(id, scope, projectId);
            if (!item) {
                reply.code(404);
                return { message: "env not found", id };
            }
            return toApiEnvironmentEntityDto(item);
        }
    );

    fastify.post<{ Body: SaveEnvBodyDto }>(
        "/",
        async (req) => {
            const body = req.body as SaveEnvBodyDto;
            const scope = body?.scope ?? "project";
            if (scope === "project" && !body.projectId) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
            }
            if (!body?.env?.id) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "env.id is required");
            }

            await api.saveEnv(body.env, scope, body.projectId);
            return { id: body.env.id };
        }
    );

    fastify.delete<{ Querystring: ListEnvsQueryDto; Params: EnvIdParamDto }>(
        "/:id",
        async (req) => {
            const { scope, projectId } = parseScope(req.query);
            const id = req.params.id;

            await api.deleteEnv(id, scope, projectId);
            return { id };
        }
    );
}
