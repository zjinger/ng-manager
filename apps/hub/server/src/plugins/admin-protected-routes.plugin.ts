import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import adminFeedbackRoutes from "../routes/admin/feedback.routes";
import adminAnnouncementRoutes from "../routes/admin/announcement.routes";
import adminDocumentRoutes from "../routes/admin/document.routes";

export default fp(async function adminProtectedRoutesPlugin(fastify: FastifyInstance) {
    fastify.addHook("preHandler", fastify.verifyAdmin);

    await fastify.register(adminFeedbackRoutes);
    await fastify.register(adminAnnouncementRoutes);
    await fastify.register(adminDocumentRoutes);
});