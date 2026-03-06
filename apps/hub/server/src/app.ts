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
import { DocumentService } from "./modules/document/document.service";
import { DocumentRepo } from "./modules/document/document.repo";
import { AuthRepo } from "./modules/auth/auth.repo";
import { AuthService } from "./modules/auth/auth.service";
import authPlugin from "./plugins/auth.plugin";

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

    const documentRepo = new DocumentRepo(app.db);
    const documentService = new DocumentService(documentRepo);

    const authRepo = new AuthRepo(app.db);
    const authService = new AuthService(authRepo);

    app.decorate("services", {
        feedback: feedbackService,
        announcement: announcementService,
        document: documentService,
        auth: authService
    });

    await app.register(authPlugin);

    await authService.ensureDefaultAdmin();

    await app.register(routesPlugin);

    return app;
}