import type { AppContainer } from "../app/build-container";
import type { AppConfig } from "../shared/env/env";
import type { RequestContext } from "../shared/context/request-context";
import type Database from "better-sqlite3";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    container: AppContainer;
    db: Database.Database;
  }

  interface FastifyRequest {
    requestContext: RequestContext | null;
  }
}
