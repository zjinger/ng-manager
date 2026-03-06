import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import healthRoutes from "../routes/public/health.routes";
import publicFeedbackRoutes from "../routes/public/feedback.routes";
import adminFeedbackRoutes from "../routes/admin/feedback.routes";
import adminAnnouncementRoutes from "../routes/admin/announcement.routes";
import publicAnnouncementRoutes from "../routes/public/announcement.routes";
import publicDocumentRoutes from "../routes/admin/document.routes";
import adminDocumentRoutes from "../routes/admin/document.routes";

export default fp(async function routesPlugin(fastify: FastifyInstance) {
    await fastify.register(healthRoutes, { prefix: "/api/public" });

    // 反馈
    await fastify.register(publicFeedbackRoutes, { prefix: "/api/public" });
    await fastify.register(adminFeedbackRoutes, { prefix: "/api/admin" });

    // 公告
    await fastify.register(publicAnnouncementRoutes, { prefix: "/api/public" });
    await fastify.register(adminAnnouncementRoutes, { prefix: "/api/admin" });

    // 文档
    await fastify.register(publicDocumentRoutes, { prefix: "/api/public" });
    await fastify.register(adminDocumentRoutes, { prefix: "/api/admin" });

    // 
});