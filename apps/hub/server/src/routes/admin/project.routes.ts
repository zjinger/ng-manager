import type { FastifyInstance } from "fastify";
import {
  createProjectSchema,
  listProjectQuerySchema,
  updateProjectSchema
} from "../../modules/project/project.schema";
import { ok } from "../../utils/response";

export default async function adminProjectRoutes(fastify: FastifyInstance) {
  fastify.get("/projects", async (request) => {
    const query = listProjectQuerySchema.parse(request.query);
    const result = fastify.services.project.list(query);
    return ok(result);
  });

  fastify.get("/projects/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.project.getById(params.id);
    return ok(item);
  });

  fastify.post("/projects", async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const item = fastify.services.project.create(body);
    return reply.status(201).send(ok(item, "project created"));
  });

  fastify.put("/projects/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateProjectSchema.parse(request.body);
    const item = fastify.services.project.update(params.id, body);
    return ok(item, "project updated");
  });

  fastify.delete("/projects/:id", async (request) => {
    const params = request.params as { id: string };
    fastify.services.project.remove(params.id);
    return ok({ id: params.id }, "project deleted");
  });
}