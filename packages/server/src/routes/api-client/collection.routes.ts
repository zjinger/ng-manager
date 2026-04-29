import { ApiScope, ApiCollectionKind, ApiCollectionEntity, newId, ApiRequestEntity } from "@yinuo-ngm/api";
import { ApiError, ApiErrorCodes } from "@yinuo-ngm/errors";
import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";

type ListQuery = { scope?: ApiScope; projectId?: string };

type CreateBody = {
    scope: ApiScope;
    projectId: string;
    name: string;
    kind: ApiCollectionKind;
    parentId?: string | null;
    order?: number;
};

type UpdateBody = {
    name?: string;
    parentId?: string | null;
    order?: number;
};

function assertProjectScope(scope: ApiScope, projectId?: string) {
    if (scope === "project" && !projectId) throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "projectId is required when scope=project");
}

function now() { return Date.now(); }

export async function apiClientCollectionsRoutes(fastify: FastifyInstance) {
    const api = fastify.core.apiClient;

    // GET /api/collections?scope=project&projectId=xxx
    fastify.get("/", async (req) => {
        const q = req.query as ListQuery;
        const scope: ApiScope = (q.scope ?? "project") as ApiScope;
        assertProjectScope(scope, q.projectId);
        const collections = await api.listCollections(scope, q.projectId);
        // 保证排序稳定
        return collections.sort((a, b) => (a.parentId ?? "").localeCompare(b.parentId ?? "") || a.order - b.order || a.name.localeCompare(b.name));
    });

    // GET /api/collections/bundle?scope=project&projectId=xxx
    fastify.get("/bundle", async (req) => {
        const q = req.query as ListQuery;
        const scope: ApiScope = (q.scope ?? "project") as ApiScope;
        assertProjectScope(scope, q.projectId);

        const [collections, requests] = await Promise.all([
            api.listCollections(scope, q.projectId),
            api.listRequests(scope, q.projectId),
        ]);

        // 保证排序稳定（collections / requests 都做）
        const cols = (collections ?? []).sort(
            (a, b) =>
                (a.parentId ?? "").localeCompare(b.parentId ?? "") ||
                a.order - b.order ||
                (a.name ?? "").localeCompare(b.name ?? "")
        );
        const reqs = (requests ?? []).sort(
            (a, b) =>
                (a.collectionId ?? "").localeCompare(b.collectionId ?? "") ||
                (a.order ?? 0) - (b.order ?? 0) ||
                (a.name ?? "").localeCompare(b.name ?? "")
        );
        return { collections: cols, requests: reqs };
    })

    // POST /api/collections
    fastify.post("/", async (req) => {
        const body = req.body as CreateBody;
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
            order: body.order ?? ts, // MVP: 用时间做 order，后续可改为同级 max+1
            createdAt: ts,
            updatedAt: ts,
        };
        await api.saveCollection(entity, scope, body.projectId);
        return entity;
    });

    // post /api/collections/:id
    fastify.post("/:id", async (req) => {
        const params = req.params as { id: string };
        const q = req.query as ListQuery;
        const body = req.body as UpdateBody;

        const scope: ApiScope = (q.scope ?? "project") as ApiScope;
        assertProjectScope(scope, q.projectId);

        const old = await api.getCollection(params.id, scope, q.projectId);
        if (!old) {
            throw new ApiError(ApiErrorCodes.API_COLLECTION_NOT_FOUND, `collection not found: ${params.id}`);
        }

        const ts = now();
        const next: ApiCollectionEntity = {
            ...old,
            name: body.name != null ? String(body.name).trim() || old.name : old.name,
            parentId: body.parentId !== undefined ? body.parentId : old.parentId,
            order: body.order !== undefined ? Number(body.order) : old.order,
            updatedAt: ts,
        };

        await api.saveCollection(next, scope, q.projectId);
        return next;
    });

    // DELETE /api/collections/:id?scope=project&projectId=xxx
    // MVP：非空校验（子 collection 或 request 归属该 collection）→ 409
    fastify.delete("/:id", async (req) => {
        const params = req.params as { id: string };
        const q = req.query as ListQuery;

        const scope: ApiScope = (q.scope ?? "project") as ApiScope;
        assertProjectScope(scope, q.projectId);

        // 1) 子 collection
        const allCols = await api.listCollections(scope, q.projectId);
        const hasChildCol = allCols.some(c => (c.parentId ?? null) === params.id);
        if (hasChildCol) {
            throw new ApiError(ApiErrorCodes.API_COLLECTION_NOT_EMPTY, "collection has child collections");
        }

        // 2) requests 归属
        const reqs = await api.listRequests(scope, q.projectId);
        const hasReq = reqs.some((r: ApiRequestEntity) => (r.collectionId ?? null) === params.id);
        if (hasReq) {
            throw new ApiError(ApiErrorCodes.API_COLLECTION_NOT_EMPTY, "collection has requests");
        }

        await api.deleteCollection(params.id, scope, q.projectId);
        return { ok: true };
    });
}
