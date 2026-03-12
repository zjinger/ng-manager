import type { FastifyInstance } from "fastify";
import {
  createProjectConfigItemSchema,
  createProjectSchema,
  createProjectVersionItemSchema,
  listProjectQuerySchema,
  updateProjectConfigItemSchema,
  updateProjectSchema,
  updateProjectVersionItemSchema
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

  fastify.get("/projects/:id/modules", async (request) => {
    const params = request.params as { id: string };
    const items = fastify.services.project.listModules(params.id);
    return ok({ items });
  });

  fastify.post("/projects/:id/modules", async (request, reply) => {
    const params = request.params as { id: string };
    const body = createProjectConfigItemSchema.parse(request.body);
    const item = fastify.services.project.addModule(params.id, body);
    return reply.status(201).send(ok(item, "project module created"));
  });

  fastify.put("/projects/:id/modules/:moduleId", async (request) => {
    const params = request.params as { id: string; moduleId: string };
    const body = updateProjectConfigItemSchema.parse(request.body);
    const item = fastify.services.project.updateModule(params.id, params.moduleId, body);
    return ok(item, "project module updated");
  });

  fastify.delete("/projects/:id/modules/:moduleId", async (request) => {
    const params = request.params as { id: string; moduleId: string };
    fastify.services.project.removeModule(params.id, params.moduleId);
    return ok({ id: params.moduleId }, "project module deleted");
  });

  fastify.get("/projects/:id/environments", async (request) => {
    const params = request.params as { id: string };
    const items = fastify.services.project.listEnvironments(params.id);
    return ok({ items });
  });

  fastify.post("/projects/:id/environments", async (request, reply) => {
    const params = request.params as { id: string };
    const body = createProjectConfigItemSchema.parse(request.body);
    const item = fastify.services.project.addEnvironment(params.id, body);
    return reply.status(201).send(ok(item, "project environment created"));
  });

  fastify.put("/projects/:id/environments/:environmentId", async (request) => {
    const params = request.params as { id: string; environmentId: string };
    const body = updateProjectConfigItemSchema.parse(request.body);
    const item = fastify.services.project.updateEnvironment(params.id, params.environmentId, body);
    return ok(item, "project environment updated");
  });

  fastify.delete("/projects/:id/environments/:environmentId", async (request) => {
    const params = request.params as { id: string; environmentId: string };
    fastify.services.project.removeEnvironment(params.id, params.environmentId);
    return ok({ id: params.environmentId }, "project environment deleted");
  });

  fastify.get("/projects/:id/versions", async (request) => {
    const params = request.params as { id: string };
    const items = fastify.services.project.listVersions(params.id);
    return ok({ items });
  });

  fastify.post("/projects/:id/versions", async (request, reply) => {
    const params = request.params as { id: string };
    const body = createProjectVersionItemSchema.parse(request.body);
    const item = fastify.services.project.addVersion(params.id, body);
    return reply.status(201).send(ok(item, "project version created"));
  });

  fastify.put("/projects/:id/versions/:versionId", async (request) => {
    const params = request.params as { id: string; versionId: string };
    const body = updateProjectVersionItemSchema.parse(request.body);
    const item = fastify.services.project.updateVersion(params.id, params.versionId, body);
    return ok(item, "project version updated");
  });

  fastify.delete("/projects/:id/versions/:versionId", async (request) => {
    const params = request.params as { id: string; versionId: string };
    fastify.services.project.removeVersion(params.id, params.versionId);
    return ok({ id: params.versionId }, "project version deleted");
  });
}
