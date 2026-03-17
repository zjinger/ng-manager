import type Database from "better-sqlite3";
import type { AnnouncementService } from "../modules/announcement/announcement.service";
import type { AuthService } from "../modules/auth/auth.service";
import type { AdminUserProfile } from "../modules/auth/auth.types";
import type { DashboardService } from "../modules/dashboard/dashboard.service";
import type { DocumentService } from "../modules/document/document.service";
import type { FeedbackService } from "../modules/feedback/feedback.service";
import type { IssueService } from "../modules/issue/issue.service";
import type { ProjectMemberService } from "../modules/project/project-member.service";
import type { ProjectService } from "../modules/project/project.service";
import type { RdService } from "../modules/rd/rd.service";
import type { ReleaseService } from "../modules/release/release.service";
import type { SharedConfigService } from "../modules/shared-config/shared-config.service";
import type { UploadService } from "../modules/upload/upload.service";
import type { UserService } from "../modules/user/user.service";
import { HubWsEvents } from "../modules/ws/ws.events";
import { HubWsManager } from "../modules/ws/ws.manager";

declare module "fastify" {
  interface FastifyInstance {
    db: Database.Database;
    services: {
      feedback: FeedbackService;
      announcement: AnnouncementService;
      dashboard: DashboardService;
      document: DocumentService;
      auth: AuthService;
      user: UserService;
      sharedConfig: SharedConfigService;
      project: ProjectService;
      projectMember: ProjectMemberService;
      release: ReleaseService;
      issue: IssueService;
      rd: RdService;
      upload: UploadService;
    };
    verifyAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    wsManager: HubWsManager;
    hubWsEvents: HubWsEvents;
  }

  interface FastifyRequest {
    adminUser: AdminUserProfile | null;
  }
}
