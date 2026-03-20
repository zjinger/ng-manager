import { createApp } from "./app/create-app";

async function bootstrap() {
  const app = await createApp();

  try {
    await app.listen({
      host: app.config.host,
      port: app.config.port
    });

    app.log.info(
      {
        host: app.config.host,
        port: app.config.port,
        nodeEnv: app.config.nodeEnv
      },
      "[hub-v2] server started"
    );
  } catch (error) {
    app.log.error(error, "[hub-v2] failed to start");
    process.exit(1);
  }
}

void bootstrap();
