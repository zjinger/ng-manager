import { createApp } from "./app";
import { env } from "./env";

async function bootstrap() {
  const app = await createApp();

  try {
    await app.listen({
      port: env.port,
      host: env.host
    });

    app.log.info(
      {
        host: env.host,
        port: env.port,
        dbPath: env.dbPath
      },
      "ngm-hub-server started"
    );
  } catch (err) {
    app.log.error(err, "failed to start server");
    process.exit(1);
  }
}

bootstrap();