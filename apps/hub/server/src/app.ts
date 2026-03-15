import cors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { env } from "./env";
import { AnnouncementRepo } from "./modules/announcement/announcement.repo";
import { AnnouncementService } from "./modules/announcement/announcement.service";
import { AuthRepo } from "./modules/auth/auth.repo";
import { AuthService } from "./modules/auth/auth.service";
import { DocumentRepo } from "./modules/document/document.repo";
import { DocumentService } from "./modules/document/document.service";
import { FeedbackRepo } from "./modules/feedback/feedback.repo";
import { FeedbackService } from "./modules/feedback/feedback.service";
import { IssueAttachmentRepo } from "./modules/issue-attachment/attachment.repo";
import { IssueAttachmentService } from "./modules/issue-attachment/attachment.service";
import { IssueCommentRepo } from "./modules/issue-comment/comment.repo";
import { IssueCommentService } from "./modules/issue-comment/comment.service";
import { IssueLogRepo } from "./modules/issue-log/issue-log.repo";
import { IssueLogService } from "./modules/issue-log/issue-log.service";
import { IssueParticipantRepo } from "./modules/issue-participant/participant.repo";
import { IssueParticipantService } from "./modules/issue-participant/participant.service";
import { IssuePermissionService } from "./modules/issue/issue.permission";
import { IssueRepo } from "./modules/issue/issue.repo";
import { IssueService } from "./modules/issue/issue.service";
import { ProjectMemberRepo } from "./modules/project/project-member.repo";
import { ProjectMemberService } from "./modules/project/project-member.service";
import { ProjectRepo } from "./modules/project/project.repo";
import { ProjectService } from "./modules/project/project.service";
import { ReleaseRepo } from "./modules/release/release.repo";
import { ReleaseService } from "./modules/release/release.service";
import { SharedConfigRepo } from "./modules/shared-config/shared-config.repo";
import { SharedConfigService } from "./modules/shared-config/shared-config.service";
import { UploadRepo } from "./modules/upload/upload.repo";
import { UploadService } from "./modules/upload/upload.service";
import { UserRepo } from "./modules/user/user.repo";
import { UserService } from "./modules/user/user.service";
import authPlugin from "./plugins/auth.plugin";
import dbPlugin from "./plugins/db.plugin";
import errorHandlerPlugin from "./plugins/error-handler.plugin";
import routesPlugin from "./plugins/routes.plugin";
import wsPlugin from "./plugins/ws.plugin";

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
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: env.uploadMaxFileSize,
      files: env.uploadMaxFiles
    }
  });

  const projectRepo = new ProjectRepo(app.db);
  const projectService = new ProjectService(projectRepo);
  const projectMemberRepo = new ProjectMemberRepo(app.db);
  const projectMemberService = new ProjectMemberService(projectRepo, projectMemberRepo);

  const feedbackRepo = new FeedbackRepo(app.db);
  const feedbackService = new FeedbackService(feedbackRepo, projectRepo);

  const announcementRepo = new AnnouncementRepo(app.db);
  const announcementService = new AnnouncementService(announcementRepo, projectRepo);

  const documentRepo = new DocumentRepo(app.db);
  const documentService = new DocumentService(documentRepo, projectRepo);

  const uploadRepo = new UploadRepo(app.db);
  const uploadService = new UploadService(uploadRepo);

  const userRepo = new UserRepo(app.db);

  const authRepo = new AuthRepo(app.db);
  const authService = new AuthService(authRepo, userRepo, uploadService);

  const sharedConfigRepo = new SharedConfigRepo(app.db);
  const sharedConfigService = new SharedConfigService(sharedConfigRepo, projectRepo);

  const userService = new UserService(userRepo, authService);

  const releaseRepo = new ReleaseRepo(app.db);
  const releaseService = new ReleaseService(releaseRepo, projectRepo, app.hubWsEvents);

  const issueRepo = new IssueRepo(app.db);
  const issueParticipantRepo = new IssueParticipantRepo(app.db);
  const issueLogRepo = new IssueLogRepo(app.db);
  const issueLogService = new IssueLogService(issueLogRepo);
  const issuePermission = new IssuePermissionService(projectMemberService, issueParticipantRepo, authRepo);
  const issueParticipantService = new IssueParticipantService(issueRepo, issueParticipantRepo, issuePermission, issueLogService);
  const issueCommentRepo = new IssueCommentRepo(app.db);
  const issueCommentService = new IssueCommentService(issueRepo, issueCommentRepo, projectMemberService, issuePermission, issueLogService);
  const issueAttachmentRepo = new IssueAttachmentRepo(app.db);
  const issueAttachmentService = new IssueAttachmentService(issueRepo, issueAttachmentRepo, uploadService, issuePermission, issueLogService);
  const issueService = new IssueService(
    issueRepo,
    projectRepo,
    projectMemberService,
    issueParticipantRepo,
    issueParticipantService,
    issueCommentService,
    issueAttachmentService,
    issueLogService,
    issuePermission
  );

  app.decorate("services", {
    feedback: feedbackService,
    announcement: announcementService,
    document: documentService,
    auth: authService,
    user: userService,
    sharedConfig: sharedConfigService,
    project: projectService,
    projectMember: projectMemberService,
    release: releaseService,
    issue: issueService
  });

  await app.register(authPlugin);
  await authService.ensureDefaultAdmin();
  await app.register(routesPlugin);

  if (env.isProd && env.webRoot) {
    const webRoot = env.webRoot;
    app.log.info({ webRoot }, "[web] static assets enabled");
    await app.register(fastifyStatic, {
      root: webRoot,
      prefix: "/",
      index: ["index.html"]
    });
    app.setNotFoundHandler((request, reply) => {
      const reqPath = request.raw.url || "";
      if (reqPath.startsWith("/api/") || reqPath.startsWith("/ws/")) {
        reply.code(404).send({
          code: "NOT_FOUND",
          message: "Route not found"
        });
        return;
      }

      if (request.method !== "GET") {
        reply.code(404).send({
          code: "NOT_FOUND",
          message: "Route not found"
        });
        return;
      }

      return reply.sendFile("index.html");
    });
  }

  return app;
}
