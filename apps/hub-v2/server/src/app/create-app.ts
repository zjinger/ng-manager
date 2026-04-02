import fs from "node:fs";
import path from "node:path";
import type { ServerOptions as HttpsServerOptions } from "node:https";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { buildContainer } from "./build-container";
import { registerPlugins } from "./register-plugins";
import { registerRoutes } from "./register-routes";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";
import { loadEnv } from "../shared/env/env";

function resolveHttpsOptions(
  config: ReturnType<typeof loadEnv>,
  cwd = process.cwd()
): HttpsServerOptions | undefined {
  if (!config.httpsEnabled) {
    return undefined;
  }

  if (!config.httpsKeyFile || !config.httpsCertFile) {
    throw new Error("[https] HTTPS is enabled but HTTPS_KEY_FILE or HTTPS_CERT_FILE is missing");
  }

  const keyPath = path.resolve(cwd, config.httpsKeyFile);
  const certPath = path.resolve(cwd, config.httpsCertFile);

  if (!fs.existsSync(keyPath)) {
    throw new Error(`[https] key file not found: ${keyPath}`);
  }
  if (!fs.existsSync(certPath)) {
    throw new Error(`[https] cert file not found: ${certPath}`);
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

export async function createApp() {
  const config = loadEnv();
  const db = createSqliteDatabase(config);
  const migrationResult = runMigrations(db);
  const https = resolveHttpsOptions(config);
  const loggerOptions = {
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
  } as const;
  const app: FastifyInstance = https
    ? (Fastify({
        https,
        logger: loggerOptions
      }) as unknown as FastifyInstance)
    : Fastify({
        logger: loggerOptions
      });

  const container = buildContainer(config, db, {
    eventBusLogger: app.log
  });

  app.decorate("config", config);
  app.decorate("container", container);
  app.decorate("db", db);

  app.log.info(
    { appliedMigrations: migrationResult.applied },
    "[hub-v2] migrations completed"
  );
  if (config.httpsEnabled) {
    app.log.info(
      {
        httpsEnabled: config.httpsEnabled,
        httpsKeyFile: config.httpsKeyFile,
        httpsCertFile: config.httpsCertFile
      },
      "[https] TLS is enabled"
    );
  }
  if (!config.authCookieSecure) {
    app.log.warn(
      {
        authCookieSecure: config.authCookieSecure
      },
      "[auth] AUTH_COOKIE_SECURE=false, HTTPS is temporarily disabled"
    );
  }

  await registerPlugins(app);
  await registerRoutes(app);

  app.addHook("onClose", async (instance) => {
    instance.wsHub?.closeAll();
    instance.db.close();
  });

  return app;
}
