import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import adminAnnouncementRoutes from "../routes/admin/announcement.routes";
import adminDocumentRoutes from "../routes/admin/document.routes";
import adminFeedbackRoutes from "../routes/admin/feedback.routes";
import adminSharedConfigRoutes from "../routes/admin/shared-config.routes";

export default fp(async function adminProtectedRoutesPlugin(fastify: FastifyInstance) {
    fastify.addHook("preHandler", fastify.verifyAdmin);

    await fastify.register(adminFeedbackRoutes);
    await fastify.register(adminAnnouncementRoutes);
    await fastify.register(adminDocumentRoutes);
    await fastify.register(adminSharedConfigRoutes);
});