import type { FastifyInstance } from "fastify";
import { ok } from "../../shared/http/response";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return ok(app.container.healthQuery.getHealth());
  });
}
