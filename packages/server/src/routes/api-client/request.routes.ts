import type { ApiClient } from "@yinuo-ngm/api";
import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type {
    ApiScope,
    ListRequestsQueryDto,
    SaveRequestBodyDto,
    UpdateRequestBodyDto
} from "@yinuo-ngm/protocol";
import type { FastifyInstance } from "fastify";
import { toApiRequestEntityDto } from "./route-mappers";

function parseScope(q: ListRequestsQueryDto): { scope: ApiScope; projectId?: string } {
    const scope = (q?.scope ?? "project") as ApiScope;
    const projectId = q?.projectId as string | undefined;
    if (scope === "project" && !projectId) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
    }
    return { scope, projectId };
}

export async function apiClientRequestsRoutes(fastify: FastifyInstance) {
    const api = fastify.core.apiClient as ApiClient;

    fastify.get<{ Querystring: ListRequestsQueryDto }>(
        "/",
        async (req) => {
            const { scope, projectId } = parseScope(req.query);
            const items = await api.listRequests(scope, projectId);
            return items.map(toApiRequestEntityDto);
        }
    );

    fastify.get<{ Querystring: ListRequestsQueryDto; Params: { id: string } }>(
        "/:id",
        async (req, reply) => {
            const { scope, projectId } = parseScope(req.query);
            const id = req.params.id;

            const item = await api.getRequest(id, scope, projectId);
            if (!item) {
                reply.code(404);
                return { message: "request not found", id };
            }
            return toApiRequestEntityDto(item);
        }
    );

    fastify.post<{ Body: SaveRequestBodyDto }>(
        "/",
        async (req) => {
            const body = req.body as SaveRequestBodyDto;
            const scope = body?.scope ?? "project";
            if (scope === "project" && !body.projectId) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
            }
            if (!body?.request?.id) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "request.id is required");
            }
            await api.saveRequest(body.request, scope, body.projectId);
            return { id: body.request.id };
        }
    );

    fastify.post<{ Body: UpdateRequestBodyDto }>(
        "/update",
        async (req) => {
            const body = req.body as UpdateRequestBodyDto;
            const scope = body?.scope ?? "project";
            if (scope === "project" && !body.projectId) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
            }
            if (!body?.request?.id) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "request.id is required");
            }
            const old = await api.getRequest(body.request.id, scope, body.projectId);
            if (!old) {
                throw new GlobalError(GlobalErrorCodes.NOT_FOUND, "request not found: " + body.request.id);
            }
            const updated = {
                ...old,
                ...body.request,
            };
            await api.saveRequest(updated, scope, body.projectId);
            return { id: body.request.id };
        }
    );

    fastify.delete<{ Querystring: ListRequestsQueryDto; Params: { id: string } }>(
        "/:id",
        async (req) => {
            const { scope, projectId } = parseScope(req.query);
            const id = req.params.id;
            await api.deleteRequest(id, scope, projectId);
            return { id };
        }
    );
}
