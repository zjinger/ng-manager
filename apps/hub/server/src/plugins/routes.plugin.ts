import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import adminAuthRoutes from "../routes/admin/auth.routes";
import publicDocumentRoutes from "../routes/admin/document.routes";
import publicAnnouncementRoutes from "../routes/public/announcement.routes";
import publicFeedbackRoutes from "../routes/public/feedback.routes";
import healthRoutes from "../routes/public/health.routes";
import publicSharedConfigRoutes from "../routes/public/shared-config.routes";
import adminProtectedRoutesPlugin from "./admin-protected-routes.plugin";

export default fp(async function routesPlugin(fastify: FastifyInstance) {
    await fastify.register(healthRoutes, { prefix: "/api/public" });
    // 反馈
    await fastify.register(publicFeedbackRoutes, { prefix: "/api/public" });
    // 公告
    await fastify.register(publicAnnouncementRoutes, { prefix: "/api/public" });
    // 文档
    await fastify.register(publicDocumentRoutes, { prefix: "/api/public" });
    // 共享配置
    await fastify.register(publicSharedConfigRoutes, { prefix: "/api/public" });
    // auth
    await fastify.register(adminAuthRoutes, { prefix: "/api/admin" });
    // 管理员受保护的路由
    await fastify.register(adminProtectedRoutesPlugin, {
        prefix: "/api/admin"
    });

});