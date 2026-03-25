import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import errorHandlerPlugin from "../plugins/error-handler.plugin";
import { createRequestContext } from "../shared/context/request-context";
import type { AuthJwtPayload } from "../shared/auth/jwt-payload";
import { wsPlugin } from "../shared/ws/ws.plugin";
import { bindEventBusToWs } from "../shared/ws/ws-bridge";

export async function registerPlugins(app: FastifyInstance) {
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: app.config.jwtSecret,
    cookie: {
      cookieName: app.config.authCookieName,
      signed: false
    }
  });
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: app.config.uploadMaxFileSize,
      files: 1
    }
  });
  await app.register(errorHandlerPlugin);
  await app.register(wsPlugin);
  bindEventBusToWs(app.container.eventBus, app.wsHub);

  await app.register(
    fp(async (fastify) => {
      fastify.decorateRequest("requestContext", null);

      fastify.addHook("onRequest", async (request) => {
        let payload: AuthJwtPayload | null = null;
        const userAgentHeader = request.headers["user-agent"];
        const userAgent =
          typeof userAgentHeader === "string" ? userAgentHeader : userAgentHeader?.[0];

        try {
          const verified = await request.jwtVerify<AuthJwtPayload>();
          payload = verified;
        } catch {
          payload = null;
        }

        request.requestContext = createRequestContext({
          accountId: payload?.accountId ?? "anonymous",
          nickname: payload?.nickname ?? null,
          userId: payload?.userId ?? null,
          roles: payload?.role ? [payload.role] : [],
          source: "http",
          requestId: request.id,
          ip: request.ip,
          userAgent
        });
      });
    })
  );
}
