import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env";
import dbPlugin from "./plugins/db.plugin";
import errorHandlerPlugin from "./plugins/error-handler.plugin";
import routesPlugin from "./plugins/routes.plugin";
import { FeedbackRepo } from "./modules/feedback/feedback.repo";
import { FeedbackService } from "./modules/feedback/feedback.service";
import { AnnouncementService } from "./modules/announcement/announcement.service";
import { AnnouncementRepo } from "./modules/announcement/announcement.repo";

export async function createApp() {
    const app = Fastify({
        logger: {
            level: env.logLevel
        }
    });

    await app.register(cors, {
        origin: true,
        credentials: true
    });

    await app.register(dbPlugin);
    await app.register(errorHandlerPlugin);

    const feedbackRepo = new FeedbackRepo(app.db);
    const feedbackService = new FeedbackService(feedbackRepo);

    const announcementRepo = new AnnouncementRepo(app.db);
    const announcementService = new AnnouncementService(announcementRepo);

    app.decorate("services", {
        feedback: feedbackService,
        announcement: announcementService
    });

    await app.register(routesPlugin);

    return app;
}