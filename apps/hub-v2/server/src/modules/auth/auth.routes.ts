import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { AppError } from "../../shared/errors/app-error";
import { ok } from "../../shared/http/response";
import { changePasswordSchema, loginSchema, updateAvatarSchema } from "./auth.schema";
import type { AdminProfile } from "./auth.types";

export default async function authRoutes(app: FastifyInstance) {
  const createAnonymousContext = () => ({
    accountId: "anonymous" as const,
    roles: [] as string[],
    projectIds: [] as string[],
    authType: "anonymous" as const,
    source: "http" as const
  });

  const setAuthCookie = async (request: FastifyRequest, reply: FastifyReply, profile: AdminProfile) => {
    const secure = app.config.authCookieSecure && request.protocol === "https";
    const token = await reply.jwtSign(
      {
        accountId: profile.id,
        username: profile.username,
        nickname: profile.nickname,
        role: profile.role,
        userId: profile.userId ?? null
      },
      {
        expiresIn: app.config.authTokenExpiresIn
      }
    );

    reply.setCookie(app.config.authCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure
    });
  };

  const logLoginResult = (
    mode: "challenge",
    outcome: "success" | "failed",
    request: FastifyRequest,
    username: string,
    extra?: Record<string, unknown>
  ): void => {
    const payload = {
      mode,
      outcome,
      username,
      ip: request.ip,
      userAgent:
        typeof request.headers["user-agent"] === "string"
          ? request.headers["user-agent"]
          : request.headers["user-agent"]?.[0],
      ...extra
    };
    if (outcome === "success") {
      app.log.info(payload, "[auth] login");
      return;
    }
    app.log.warn(payload, "[auth] login");
  };

  app.get("/auth/login/challenge", async () => {
    return ok(app.container.authCommand.issueLoginChallenge());
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const username = body.username.trim();
    let profile: AdminProfile;
    try {
      profile = await app.container.authCommand.login(
        body,
        request.requestContext ?? createAnonymousContext()
      );
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      logLoginResult("challenge", "failed", request, username, {
        code: appError?.code,
        statusCode: appError?.statusCode
      });
      throw error;
    }

    await setAuthCookie(request, reply, profile);
    logLoginResult("challenge", "success", request, username, {
      accountId: profile.id,
      role: profile.role
    });

    return ok(profile, "login success");
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
