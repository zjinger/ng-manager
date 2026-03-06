import type Database from "better-sqlite3";
import type { FeedbackService } from "../modules/feedback/feedback.service";

declare module "fastify" {
    interface FastifyInstance {
        db: Database.Database;
        services: {
            feedback: FeedbackService;
        };
    }
}