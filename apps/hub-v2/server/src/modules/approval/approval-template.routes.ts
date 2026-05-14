import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createApprovalTemplateSchema,
  listApprovalTemplatesQuerySchema,
  updateApprovalTemplateSchema
} from "./approval-template.schema";

export default async function approvalTemplateRoutes(app: FastifyInstance) {
  app.get("/approval-templates", async (request) => {
    const ctx = requireAuth(request);
    const query = listApprovalTemplatesQuerySchema.parse(request.query);
    return ok({ items: await app.container.approvalTemplateQuery.list(query, ctx) });
  });

  app.post("/approval-templates", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createApprovalTemplateSchema.parse(request.body);
    const item = await app.container.approvalTemplateCommand.create(body, ctx);
    return reply.status(201).send(ok(item, "approval template created"));
  });

  app.get("/approval-templates/:templateId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { templateId: string };
    return ok(await app.container.approvalTemplateQuery.getById(params.templateId, ctx));
  });

  app.patch("/approval-templates/:templateId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { templateId: string };
    const body = updateApprovalTemplateSchema.parse(request.body);
    return ok(await app.container.approvalTemplateCommand.update(params.templateId, body, ctx), "approval template updated");
  });
}
