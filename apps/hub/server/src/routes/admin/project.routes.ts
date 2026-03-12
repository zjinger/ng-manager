import type { FastifyInstance } from "fastify";
import {
  createProjectMemberSchema,
  createProjectSchema,
  listProjectQuerySchema,
  updateProjectMemberSchema,
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

  fastify.get("/projects/:id/members", async (request) => {
    const params = request.params as { id: string };
    const items = fastify.services.project.listMembers(params.id);
    return ok({ items });
  });

  fastify.post("/projects/:id/members", async (request, reply) => {
    const params = request.params as { id: string };
    const body = createProjectMemberSchema.parse(request.body);
    const item = fastify.services.project.addMember(params.id, body);
    return reply.status(201).send(ok(item, "project member created"));
  });

  fastify.put("/projects/:id/members/:memberId", async (request) => {
    const params = request.params as { id: string; memberId: string };
    const body = updateProjectMemberSchema.parse(request.body);
    const item = fastify.services.project.updateMember(params.id, params.memberId, body);
    return ok(item, "project member updated");
  });

  fastify.delete("/projects/:id/members/:memberId", async (request) => {
    const params = request.params as { id: string; memberId: string };
    fastify.services.project.removeMember(params.id, params.memberId);
    return ok({ id: params.memberId }, "project member deleted");
  });
}
