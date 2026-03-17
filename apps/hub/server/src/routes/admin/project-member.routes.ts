import type { FastifyInstance } from "fastify";
import {
  createProjectMemberSchema,
  updateProjectMemberSchema
} from "../../modules/project/project.schema";
import { AppError } from "../../utils/app-error";
import { ok } from "../../utils/response";

function getOperator(request: { adminUser: { id: string; userId?: string | null; username: string } | null }) {
  if (!request.adminUser) {
    throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
  }
  return {
    operatorId: request.adminUser.userId?.trim() || request.adminUser.id
  };
}

export default async function adminProjectMemberRoutes(fastify: FastifyInstance) {
  fastify.get("/projects/:id/members", async (request) => {
    const params = request.params as { id: string };
    const items = fastify.services.projectMember.listMembers(params.id);
    return ok({ items });
  });

  fastify.post("/projects/:id/members", async (request, reply) => {
    const params = request.params as { id: string };
    const body = createProjectMemberSchema.parse(request.body);
    const operator = getOperator(request);
    fastify.services.projectMember.assertCanManageProject(params.id, operator.operatorId, "manage project members");
    const item = fastify.services.projectMember.addMember(params.id, body);
    return reply.status(201).send(ok(item, "project member created"));
  });

  fastify.put("/projects/:id/members/:memberId", async (request) => {
    const params = request.params as { id: string; memberId: string };
    const body = updateProjectMemberSchema.parse(request.body);
    const operator = getOperator(request);
    fastify.services.projectMember.assertCanManageProject(params.id, operator.operatorId, "manage project members");
    const item = fastify.services.projectMember.updateMember(params.id, params.memberId, body);
    return ok(item, "project member updated");
  });

  fastify.delete("/projects/:id/members/:memberId", async (request) => {
    const params = request.params as { id: string; memberId: string };
    const operator = getOperator(request);
    fastify.services.projectMember.assertCanManageProject(params.id, operator.operatorId, "manage project members");
    fastify.services.projectMember.removeMember(params.id, params.memberId);
    return ok({ id: params.memberId }, "project member deleted");
  });
}
