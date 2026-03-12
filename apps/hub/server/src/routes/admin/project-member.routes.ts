import type { FastifyInstance } from "fastify";
import {
  createProjectMemberSchema,
  updateProjectMemberSchema
} from "../../modules/project/project.schema";
import { ok } from "../../utils/response";

export default async function adminProjectMemberRoutes(fastify: FastifyInstance) {
  fastify.get("/projects/:id/members", async (request) => {
    const params = request.params as { id: string };
    const items = fastify.services.projectMember.listMembers(params.id);
    return ok({ items });
  });

  fastify.post("/projects/:id/members", async (request, reply) => {
    const params = request.params as { id: string };
    const body = createProjectMemberSchema.parse(request.body);
    const item = fastify.services.projectMember.addMember(params.id, body);
    return reply.status(201).send(ok(item, "project member created"));
  });

  fastify.put("/projects/:id/members/:memberId", async (request) => {
    const params = request.params as { id: string; memberId: string };
    const body = updateProjectMemberSchema.parse(request.body);
    const item = fastify.services.projectMember.updateMember(params.id, params.memberId, body);
    return ok(item, "project member updated");
  });

  fastify.delete("/projects/:id/members/:memberId", async (request) => {
    const params = request.params as { id: string; memberId: string };
    fastify.services.projectMember.removeMember(params.id, params.memberId);
    return ok({ id: params.memberId }, "project member deleted");
  });
}
