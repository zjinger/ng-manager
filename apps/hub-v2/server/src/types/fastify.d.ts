import type { AppContainer } from "../app/build-container";
import type { AppConfig } from "../shared/env/env";
import type { RequestContext } from "../shared/context/request-context";
import type Database from "better-sqlite3";
import type { WsHub } from "../shared/ws/ws-hub";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    container: AppContainer;
    db: Database.Database;
    wsHub: WsHub;
  }

  interface FastifyRequest {
    requestContext: RequestContext | null;
  }
}
