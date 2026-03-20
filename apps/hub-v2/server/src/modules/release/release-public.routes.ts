import type { FastifyInstance } from "fastify";
import { createRequestContext } from "../../shared/context/request-context";
import { ok } from "../../shared/http/response";
import { listReleasesQuerySchema } from "./release.schema";

export default async function releasePublicRoutes(app: FastifyInstance) {
  app.get("/releases/latest", async (request) => {
    const query = listReleasesQuerySchema.parse(request.query);
    const ctx = createRequestContext({
      accountId: "public",
      roles: [],
      source: "http",
      requestId: request.id,
      ip: request.ip
    });

    const result = await app.container.releaseQuery.listPublic(
      {
        ...query,
        page: 1,
        pageSize: 1
      },
      ctx
    );

    return ok(result.items[0] ?? null);
  });

  app.get("/releases", async (request) => {
    const query = listReleasesQuerySchema.parse(request.query);
    const ctx = createRequestContext({
      accountId: "public",
      roles: [],
      source: "http",
      requestId: request.id,
      ip: request.ip
    });
    return ok(await app.container.releaseQuery.listPublic(query, ctx));
  });
}
