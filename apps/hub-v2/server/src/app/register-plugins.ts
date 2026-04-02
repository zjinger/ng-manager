import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import { AppError } from "../shared/errors/app-error";
import { ERROR_CODES } from "../shared/errors/error-codes";
import errorHandlerPlugin from "../plugins/error-handler.plugin";
import { createRequestContext } from "../shared/context/request-context";
import type { AuthJwtPayload } from "../shared/auth/jwt-payload";
import { bindEventBusToNotifications } from "../shared/event/notification-bridge";
import { wsPlugin } from "../shared/ws/ws.plugin";
import { bindEventBusToWs } from "../shared/ws/ws-bridge";

const TOKEN_RATE_WINDOW_MS = 60 * 1000;
const TOKEN_RATE_LIMIT_PER_WINDOW = 600;
const TOKEN_RATE_ENTRY_TTL_MS = TOKEN_RATE_WINDOW_MS * 5;
type TokenRateBucket = { windowStart: number; count: number; lastSeen: number };
const tokenRateBuckets = new Map<string, TokenRateBucket>();

function enforceTokenRateLimit(tokenKey: string, now = Date.now()): void {
  let bucket = tokenRateBuckets.get(tokenKey);
  if (!bucket) {
    tokenRateBuckets.set(tokenKey, { windowStart: now, count: 1, lastSeen: now });
    return;
  }

  const inCurrentWindow = now - bucket.windowStart < TOKEN_RATE_WINDOW_MS;
  if (!inCurrentWindow) {
    bucket.windowStart = now;
    bucket.count = 1;
    bucket.lastSeen = now;
    tokenRateBuckets.set(tokenKey, bucket);
    return;
  }

  bucket.count += 1;
  bucket.lastSeen = now;
  tokenRateBuckets.set(tokenKey, bucket);

  if (bucket.count > TOKEN_RATE_LIMIT_PER_WINDOW) {
    throw new AppError(ERROR_CODES.TOKEN_RATE_LIMITED, "token request rate limited", 429, {
      limit: TOKEN_RATE_LIMIT_PER_WINDOW,
      windowMs: TOKEN_RATE_WINDOW_MS
    });
  }
}

function cleanupTokenRateBuckets(now = Date.now()): void {
  if (tokenRateBuckets.size < 2048) {
    return;
  }

  for (const [key, bucket] of tokenRateBuckets.entries()) {
    if (now - bucket.lastSeen > TOKEN_RATE_ENTRY_TTL_MS) {
      tokenRateBuckets.delete(key);
    }
  }
}

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
  bindEventBusToNotifications(app.container.eventBus, app.container.notificationIngest, app.wsHub);

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
            const now = Date.now();
            enforceTokenRateLimit(`project:${verifiedToken.tokenId}`, now);
            cleanupTokenRateBuckets(now);
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
            const now = Date.now();
            enforceTokenRateLimit(`personal:${verifiedToken.tokenId}`, now);
            cleanupTokenRateBuckets(now);
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
