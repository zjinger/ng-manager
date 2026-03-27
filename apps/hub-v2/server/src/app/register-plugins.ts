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
        const requestPath = request.url.split("?")[0] ?? request.url;
        const authHeader = request.headers.authorization;
        const bearerToken =
          typeof authHeader === "string" && authHeader.startsWith("Bearer ")
            ? authHeader.slice("Bearer ".length).trim()
            : "";

        if (requestPath.startsWith("/api/token/") && bearerToken) {
          const verifiedToken = await fastify.container.apiTokenQuery.verifyToken(bearerToken);
          if (verifiedToken) {
            request.requestContext = createRequestContext({
              accountId: verifiedToken.tokenId,
              userId: verifiedToken.ownerUserId,
              roles: ["token"],
              projectIds: [verifiedToken.projectId],
              authType: "token",
              authScopes: verifiedToken.scopes,
              tokenId: verifiedToken.tokenId,
              source: "http",
              requestId: request.id,
              ip: request.ip,
              userAgent
            });
            return;
          }
        }

        if (requestPath.startsWith("/api/personal/") && bearerToken) {
          const verifiedToken = await fastify.container.personalTokenQuery.verifyToken(bearerToken);
          if (verifiedToken) {
            request.requestContext = createRequestContext({
              accountId: verifiedToken.tokenId,
              userId: verifiedToken.ownerUserId,
              nickname: verifiedToken.ownerNickname,
              roles: ["personal_token"],
              authType: "personal_token",
              authScopes: verifiedToken.scopes,
              tokenId: verifiedToken.tokenId,
              source: "http",
              requestId: request.id,
              ip: request.ip,
              userAgent
            });
            return;
          }
        }

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
          authType: payload ? "user" : "anonymous",
          source: "http",
          requestId: request.id,
          ip: request.ip,
          userAgent
        });
      });
    })
  );
}
