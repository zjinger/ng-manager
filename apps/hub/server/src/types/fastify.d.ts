import type Database from "better-sqlite3";
import type { AnnouncementService } from "../modules/announcement/announcement.service";
import type { AuthService } from "../modules/auth/auth.service";
import type { AdminUserProfile } from "../modules/auth/auth.types";
import type { DocumentService } from "../modules/document/document.service";
import type { FeedbackService } from "../modules/feedback/feedback.service";
import { ProjectService } from "../modules/project/project.service";
import type { SharedConfigService } from "../modules/shared-config/shared-config.service";
declare module "fastify" {
    interface FastifyInstance {
        db: Database.Database;
        services: {
            feedback: FeedbackService;
            announcement: AnnouncementService;
            document: DocumentService;
            auth: AuthService;
            sharedConfig: SharedConfigService;
            project: ProjectService
        };
        verifyAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    }

    interface FastifyRequest {
        adminUser: AdminUserProfile | null;
    }
}