import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createDeliveryWeeklyReportSchema,
  listDeliveryWeeklyReportsQuerySchema
} from "./delivery-weekly-report.schema";
import type { DeliveryWeeklyReportSnapshotPayload } from "./delivery-weekly-report.types";

export default async function deliveryWeeklyReportRoutes(app: FastifyInstance) {
  app.get("/delivery-weekly-reports", async (request) => {
    const ctx = requireAuth(request);
    const query = listDeliveryWeeklyReportsQuerySchema.parse(request.query);
    return ok(await app.container.deliveryWeeklyReportQuery.list(query, ctx));
  });

  app.post("/delivery-weekly-reports", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createDeliveryWeeklyReportSchema.parse(request.body) as DeliveryWeeklyReportSnapshotPayload;
    const entity = await app.container.deliveryWeeklyReportCommand.create(body, ctx);
    return reply.status(201).send(ok(entity, "delivery weekly report created"));
  });

  app.get("/delivery-weekly-reports/:reportId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { reportId: string };
    return ok(await app.container.deliveryWeeklyReportQuery.getById(params.reportId, ctx));
  });

  app.delete("/delivery-weekly-reports/:reportId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { reportId: string };
    return ok(await app.container.deliveryWeeklyReportCommand.delete(params.reportId, ctx));
  });
}
