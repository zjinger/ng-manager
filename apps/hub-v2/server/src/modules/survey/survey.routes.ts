import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createSurveySchema,
  listSurveySubmissionsQuerySchema,
  listSurveysQuerySchema,
  updateSurveySchema
} from "./survey.schema";

export default async function surveyRoutes(app: FastifyInstance) {
  app.get("/surveys", async (request) => {
    const ctx = requireAuth(request);
    const query = listSurveysQuerySchema.parse(request.query);
    return ok(await app.container.surveyQuery.list(query, ctx));
  });

  app.post("/surveys", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createSurveySchema.parse(request.body);
    const entity = await app.container.surveyCommand.create(body, ctx);
    return reply.status(201).send(ok(entity, "survey created"));
  });

  app.get("/surveys/:surveyId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    return ok(await app.container.surveyQuery.getById(params.surveyId, ctx));
  });

  app.put("/surveys/:surveyId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    const body = updateSurveySchema.parse(request.body);
    return ok(await app.container.surveyCommand.update(params.surveyId, body, ctx), "survey updated");
  });

  app.post("/surveys/:surveyId/publish", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    return ok(await app.container.surveyCommand.publish(params.surveyId, ctx), "survey published");
  });

  app.post("/surveys/:surveyId/archive", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    return ok(await app.container.surveyCommand.archive(params.surveyId, ctx), "survey archived");
  });

  app.post("/surveys/:surveyId/draft", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    return ok(await app.container.surveyCommand.draft(params.surveyId, ctx), "survey switched to draft");
  });

  app.get("/surveys/:surveyId/submissions", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    const query = listSurveySubmissionsQuerySchema.parse(request.query);
    return ok(await app.container.surveyQuery.listSubmissions(params.surveyId, query, ctx));
  });

  app.get("/surveys/:surveyId/submissions/stats", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    return ok(await app.container.surveyQuery.getSubmissionStats(params.surveyId, ctx));
  });

  app.get("/surveys/:surveyId/submissions/export.csv", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { surveyId: string };
    const result = await app.container.surveyQuery.exportSubmissionsCsv(params.surveyId, ctx);
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename=\"${result.filename}\"`);
    return reply.send(result.content);
  });
}
