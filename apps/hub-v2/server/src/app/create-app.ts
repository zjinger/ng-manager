import Fastify from "fastify";
import { buildContainer } from "./build-container";
import { registerPlugins } from "./register-plugins";
import { registerRoutes } from "./register-routes";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";
import { loadEnv } from "../shared/env/env";

export async function createApp() {
  const config = loadEnv();
  const db = createSqliteDatabase(config);
  const migrationResult = runMigrations(db);
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.logLevel === "debug"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "yyyy-mm-dd HH:MM:ss.l o",
                ignore: "pid,hostname"
              }
            }
          : undefined
    }
  });

  const container = buildContainer(config, db);

  app.decorate("config", config);
  app.decorate("container", container);
  app.decorate("db", db);

  app.log.info(
    { appliedMigrations: migrationResult.applied },
    "[hub-v2] migrations completed"
  );

  await registerPlugins(app);
  await registerRoutes(app);

  app.addHook("onClose", async (instance) => {
    instance.wsHub?.closeAll();
    instance.db.close();
  });

  return app;
}
