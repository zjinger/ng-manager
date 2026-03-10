import type { FastifyInstance } from "fastify";

import adminAnnouncementRoutes from "../routes/admin/announcement.routes";
import adminBroadcastRoutes from "../routes/admin/broadcast.routes";
import adminDocumentRoutes from "../routes/admin/document.routes";
import adminFeedbackRoutes from "../routes/admin/feedback.routes";
import adminProjectRoutes from "../routes/admin/project.routes";
import adminReleaseRoutes from "../routes/admin/release.routes";
import adminSharedConfigRoutes from "../routes/admin/shared-config.routes";
import adminWsRoutes from "../routes/admin/ws.routes";

export default async function adminProtectedRoutesPlugin(fastify: FastifyInstance) {
    fastify.addHook("preHandler", fastify.verifyAdmin);

    await fastify.register(adminFeedbackRoutes);
    await fastify.register(adminAnnouncementRoutes);
    await fastify.register(adminDocumentRoutes);
    await fastify.register(adminSharedConfigRoutes);
    await fastify.register(adminProjectRoutes);
    await fastify.register(adminReleaseRoutes);
    await fastify.register(adminWsRoutes);
    await fastify.register(adminBroadcastRoutes);
}