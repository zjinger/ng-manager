import type { ApiClient, ApiCollectionEntity, ApiRequestEntity } from "@yinuo-ngm/api";
import { ApiScope, newId } from "@yinuo-ngm/api";
import { ApiError, ApiErrorCodes, GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type {
    CollectionIdParamDto,
    CollectionsBundleDto,
    CreateCollectionBodyDto,
    ListCollectionsQueryDto,
    UpdateCollectionBodyDto
} from "@yinuo-ngm/protocol";
import type { FastifyInstance } from "fastify";
import { toApiCollectionEntityDto, toApiRequestEntityDto } from "./route-mappers";

function assertProjectScope(scope: ApiScope, projectId?: string) {
    if (scope === "project" && !projectId) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
    }
}

function now(): number { return Date.now(); }

export async function apiClientCollectionsRoutes(fastify: FastifyInstance) {
    const api = fastify.core.apiClient as ApiClient;

    fastify.get<{ Querystring: ListCollectionsQueryDto }>(
        "/",
        async (req) => {
            const scope: ApiScope = (req.query?.scope ?? "project") as ApiScope;
            assertProjectScope(scope, req.query?.projectId);
            const collections = await api.listCollections(scope, req.query?.projectId);
            return collections.sort(
                (a, b) =>
                    (a.parentId ?? "").localeCompare(b.parentId ?? "") ||
                    a.order - b.order ||
                    a.name.localeCompare(b.name)
            ).map(toApiCollectionEntityDto);
        }
    );

    fastify.get<{ Querystring: ListCollectionsQueryDto }>(
        "/bundle",
        async (req) => {
            const scope: ApiScope = (req.query?.scope ?? "project") as ApiScope;
            assertProjectScope(scope, req.query?.projectId);

            const [collections, requests] = await Promise.all([
                api.listCollections(scope, req.query?.projectId),
                api.listRequests(scope, req.query?.projectId),
            ]);

            const cols = collections.sort(
                (a, b) =>
                    (a.parentId ?? "").localeCompare(b.parentId ?? "") ||
                    a.order - b.order ||
                    (a.name ?? "").localeCompare(b.name ?? "")
            ).map(toApiCollectionEntityDto);

            const reqs = requests.sort(
                (a, b) =>
                    (a.collectionId ?? "").localeCompare(b.collectionId ?? "") ||
                    (a.order ?? 0) - (b.order ?? 0) ||
                    (a.name ?? "").localeCompare(b.name ?? "")
            ).map(toApiRequestEntityDto);

            return { collections: cols, requests: reqs } as CollectionsBundleDto;
        }
    );

    fastify.post<{ Body: CreateCollectionBodyDto }>(
        "/",
        async (req) => {
            const body = req.body as CreateCollectionBodyDto;
            const scope: ApiScope = (body.scope ?? "project") as ApiScope;
            assertProjectScope(scope, body.projectId);

            const ts = now();
            const entity: ApiCollectionEntity = {
                id: newId("col"),
                name: String(body.name ?? "").trim() || "New Collection",
                kind: body.kind ?? "collection",
                scope,
                nodes: [],
                projectId: scope === "project" ? body.projectId : undefined,
                parentId: body.parentId ?? null,
                order: body.order ?? ts,
                createdAt: ts,
                updatedAt: ts,
            };

            await api.saveCollection(entity, scope, body.projectId);
            return toApiCollectionEntityDto(entity);
        }
    );

    fastify.post<{ Querystring: ListCollectionsQueryDto; Params: CollectionIdParamDto; Body: UpdateCollectionBodyDto }>(
        "/:id",
        async (req) => {
            const q = req.query as ListCollectionsQueryDto;
            const body = req.body as UpdateCollectionBodyDto;
            const scope: ApiScope = (q?.scope ?? "project") as ApiScope;
            assertProjectScope(scope, q?.projectId);

            const old = await api.getCollection(req.params.id, scope, q?.projectId);
            if (!old) {
                throw new ApiError(ApiErrorCodes.API_COLLECTION_NOT_FOUND, `collection not found: ${req.params.id}`);
            }

            const ts = now();
            const next: ApiCollectionEntity = {
                ...old,
                name: body.name != null ? String(body.name).trim() || old.name : old.name,
                parentId: body.parentId !== undefined ? body.parentId : old.parentId,
                order: body.order !== undefined ? Number(body.order) : old.order,
                updatedAt: ts,
            };

            await api.saveCollection(next, scope, q?.projectId);
            return toApiCollectionEntityDto(next);
        }
    );

    fastify.delete<{ Querystring: ListCollectionsQueryDto; Params: CollectionIdParamDto }>(
        "/:id",
        async (req) => {
            const q = req.query as ListCollectionsQueryDto;
            const scope: ApiScope = (q?.scope ?? "project") as ApiScope;
            assertProjectScope(scope, q?.projectId);

            const allCols = await api.listCollections(scope, q?.projectId);
            const hasChildCol = (allCols as ApiCollectionEntity[]).some(c => (c.parentId ?? null) === req.params.id);
            if (hasChildCol) {
                throw new ApiError(ApiErrorCodes.API_COLLECTION_NOT_EMPTY, "collection has child collections");
            }

            const reqs = await api.listRequests(scope, q?.projectId);
            const hasReq = (reqs as ApiRequestEntity[]).some(r => (r.collectionId ?? null) === req.params.id);
            if (hasReq) {
                throw new ApiError(ApiErrorCodes.API_COLLECTION_NOT_EMPTY, "collection has requests");
            }

            await api.deleteCollection(req.params.id, scope, q?.projectId);
            return { ok: true };
        }
    );
}
