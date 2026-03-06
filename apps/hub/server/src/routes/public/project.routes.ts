import type { FastifyInstance } from "fastify";
import { ok } from "../../utils/response";

export default async function publicProjectRoutes(fastify: FastifyInstance) {
  fastify.get("/projects", async () => {
    const items = fastify.services.project.listPublic();
    return ok(items);
  });

  fastify.get("/projects/:projectKey", async (request) => {
    const params = request.params as { projectKey: string };
    const item = fastify.services.project.getPublicByKey(params.projectKey);
    return ok(item);
  });
}