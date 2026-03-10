import cors from "@fastify/cors";
import Fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";
import { env } from "./env";
import { AnnouncementRepo } from "./modules/announcement/announcement.repo";
import { AnnouncementService } from "./modules/announcement/announcement.service";
import { AuthRepo } from "./modules/auth/auth.repo";
import { AuthService } from "./modules/auth/auth.service";
import { DocumentRepo } from "./modules/document/document.repo";
import { DocumentService } from "./modules/document/document.service";
import { FeedbackRepo } from "./modules/feedback/feedback.repo";
import { FeedbackService } from "./modules/feedback/feedback.service";
import { ProjectRepo } from "./modules/project/project.repo";
import { ProjectService } from "./modules/project/project.service";
import { ReleaseRepo } from "./modules/release/release.repo";
import { ReleaseService } from "./modules/release/release.service";
import { SharedConfigRepo } from "./modules/shared-config/shared-config.repo";
import { SharedConfigService } from "./modules/shared-config/shared-config.service";
import authPlugin from "./plugins/auth.plugin";
import dbPlugin from "./plugins/db.plugin";
import errorHandlerPlugin from "./plugins/error-handler.plugin";
import routesPlugin from "./plugins/routes.plugin";
import wsPlugin from "./plugins/ws.plugin";
import { IssueRepo } from "./modules/issue/issue.repo";
import { IssueService } from "./modules/issue/issue.service";

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
    await app.register(wsPlugin);
    // 注册文件上传插件
    await app.register(fastifyMultipart, {
        limits: {
            fileSize: env.uploadMaxFileSize, // 限制文件大小
            files: env.uploadMaxFiles  // 限制同时上传文件数量
        }
    });

    const projectRepo = new ProjectRepo(app.db);
    const projectService = new ProjectService(projectRepo);

    const feedbackRepo = new FeedbackRepo(app.db);
    const feedbackService = new FeedbackService(feedbackRepo, projectRepo);

    const announcementRepo = new AnnouncementRepo(app.db);
    const announcementService = new AnnouncementService(announcementRepo, projectRepo);

    const documentRepo = new DocumentRepo(app.db);
    const documentService = new DocumentService(documentRepo, projectRepo);

    const authRepo = new AuthRepo(app.db);
    const authService = new AuthService(authRepo);

    const sharedConfigRepo = new SharedConfigRepo(app.db);
    const sharedConfigService = new SharedConfigService(sharedConfigRepo, projectRepo);

    const releaseRepo = new ReleaseRepo(app.db);
    const releaseService = new ReleaseService(releaseRepo, projectRepo, app.hubWsEvents);

    const issueRepo = new IssueRepo(app.db);
    const issueService = new IssueService(issueRepo, projectRepo);

    app.decorate("services", {
        feedback: feedbackService,
        announcement: announcementService,
        document: documentService,
        auth: authService,
        sharedConfig: sharedConfigService,
        project: projectService,
        release: releaseService,
        issue: issueService
    });

    await app.register(authPlugin);
    await authService.ensureDefaultAdmin();
    await app.register(routesPlugin);
    return app;
}