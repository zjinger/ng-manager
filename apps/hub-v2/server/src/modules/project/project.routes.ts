import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  addProjectMemberSchema,
  createProjectSchema,
  listProjectsQuerySchema
} from "./project.schema";

export default async function projectRoutes(app: FastifyInstance) {
  app.get("/projects", async (request) => {
    const ctx = requireAuth(request);
    const query = listProjectsQuerySchema.parse(request.query);
    return ok(await app.container.projectQuery.listAccessible(query, ctx));
  });

  app.post("/projects", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createProjectSchema.parse(request.body);
    const project = await app.container.projectCommand.create(body, ctx);
    return reply.status(201).send(ok(project, "project created"));
  });

  app.get("/projects/:projectId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok(await app.container.projectQuery.getById(params.projectId, ctx));
  });

  app.get("/projects/:projectId/members", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok({ items: await app.container.projectQuery.listMembers(params.projectId, ctx) });
  });

  app.post("/projects/:projectId/members", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = addProjectMemberSchema.parse(request.body);
    const member = await app.container.projectCommand.addMember(params.projectId, body, ctx);
    return reply.status(201).send(ok(member, "project member created"));
  });

  app.delete("/projects/:projectId/members/:memberId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; memberId: string };
    await app.container.projectCommand.removeMember(params.projectId, params.memberId, ctx);
    return ok({ id: params.memberId }, "project member removed");
  });
}
