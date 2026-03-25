import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ok } from "../../shared/http/response";
import { changePasswordSchema, loginSchema, updateAvatarSchema } from "./auth.schema";

export default async function authRoutes(app: FastifyInstance) {
  app.get("/auth/login/challenge", async () => {
    return ok(app.container.authCommand.issueLoginChallenge());
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const profile = await app.container.authCommand.login(
      body,
      request.requestContext ?? {
        accountId: "anonymous",
        roles: [],
        projectIds: [],
        authType: "anonymous",
        source: "http"
      }
    );

    const token = await reply.jwtSign({
      accountId: profile.id,
      username: profile.username,
      nickname: profile.nickname,
      role: profile.role,
      userId: profile.userId ?? null
    });

    reply.setCookie(app.config.authCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: app.config.authCookieSecure
    });

    return ok(profile, "login success");
  });

  app.post("/auth/login/plain", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    if (!("password" in body)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "plain login requires password", 400);
    }

    const profile = await app.container.authCommand.login(
      body,
      request.requestContext ?? {
        accountId: "anonymous",
        roles: [],
        projectIds: [],
        authType: "anonymous",
        source: "http"
      }
    );

    const token = await reply.jwtSign({
      accountId: profile.id,
      username: profile.username,
      nickname: profile.nickname,
      role: profile.role,
      userId: profile.userId ?? null
    });

    reply.setCookie(app.config.authCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: app.config.authCookieSecure
    });

    return ok(profile, "plain login success");
  });

  app.get("/auth/me", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.authQuery.me(ctx));
  });

  app.post("/auth/change-password", async (request) => {
    const ctx = requireAuth(request);
    const body = changePasswordSchema.parse(request.body);
    return ok(await app.container.authCommand.changePassword(body, ctx), "password changed");
  });

  app.patch("/auth/avatar", async (request) => {
    const ctx = requireAuth(request);
    const body = updateAvatarSchema.parse(request.body);
    return ok(await app.container.authCommand.updateAvatar({ uploadId: body.uploadId ?? null }, ctx), "avatar updated");
  });

  app.post("/auth/logout", async (request, reply) => {
    const ctx = requireAuth(request);
    await app.container.authCommand.logout(ctx);
    reply.clearCookie(app.config.authCookieName, {
      path: "/"
    });

    return ok({ ok: true }, "logout success");
  });
}
