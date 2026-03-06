import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import healthRoutes from "../routes/public/health.routes";
import publicFeedbackRoutes from "../routes/public/feedback.routes";
import adminFeedbackRoutes from "../routes/admin/feedback.routes";
import adminAnnouncementRoutes from "../routes/admin/announcement.routes";

export default fp(async function routesPlugin(fastify: FastifyInstance) {
  await fastify.register(healthRoutes, { prefix: "/api/public" });
  await fastify.register(publicFeedbackRoutes, { prefix: "/api/public" });

  await fastify.register(adminFeedbackRoutes, { prefix: "/api/admin" });
  await fastify.register(adminAnnouncementRoutes, { prefix: "/api/admin" });
});