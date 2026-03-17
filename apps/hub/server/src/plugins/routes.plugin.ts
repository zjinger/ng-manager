import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

// admin 路由中又分为受保护的和不受保护的，受保护的需要先验证管理员身份
import adminAuthRoutes from "../routes/admin/auth.routes";

import publicAnnouncementRoutes from "../routes/public/announcement.routes";
import publicDocumentRoutes from "../routes/public/document.routes";
import publicFeedbackRoutes from "../routes/public/feedback.routes";
import healthRoutes from "../routes/public/health.routes";
import publicProjectRoutes from "../routes/public/project.routes";
import publicSharedConfigRoutes from "../routes/public/shared-config.routes";

// 管理员受保护的路由
import adminProtectedRoutesPlugin from "./admin-protected-routes.plugin";
import publicUploadRoutes from "../routes/public/upload.routes";

// public 路由不需要验证身份，admin 路由需要验证管理员身份
export default fp(async function routesPlugin(fastify: FastifyInstance) {
    // 健康检查
    await fastify.register(healthRoutes, { prefix: "/api/public" });
    // 反馈
    await fastify.register(publicFeedbackRoutes, { prefix: "/api/public" });
    // 公告
    await fastify.register(publicAnnouncementRoutes, { prefix: "/api/public" });
    // 文档
    await fastify.register(publicDocumentRoutes, { prefix: "/api/public" });
    // 共享配置
    await fastify.register(publicSharedConfigRoutes, { prefix: "/api/public" });
    // 项目
    await fastify.register(publicProjectRoutes, { prefix: "/api/public" });

    // upload
    await fastify.register(publicUploadRoutes, { prefix: "/api/public" });

    // auth
    await fastify.register(adminAuthRoutes, { prefix: "/api/admin" });




    // 管理员受保护的路由
    await fastify.register(adminProtectedRoutesPlugin, {
        prefix: "/api/admin"
    });

});