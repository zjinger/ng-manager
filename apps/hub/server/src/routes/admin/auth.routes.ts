import type { FastifyInstance } from "fastify";
import { env } from "../../env";
import { changePasswordSchema, loginSchema } from "../../modules/auth/auth.schema";
import { ok } from "../../utils/response";

export default async function adminAuthRoutes(fastify: FastifyInstance) {
    fastify.post("/auth/login", async (request, reply) => {
        const body = loginSchema.parse(request.body);
        const profile = await fastify.services.auth.login(body);

        const token = await reply.jwtSign({
            sub: profile.id,
            username: profile.username
        });

        reply.setCookie(env.authCookieName, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: !env.isDev,
            path: "/",
            maxAge: 7 * 24 * 60 * 60
        });

        return ok(profile, "login success");
    });

    fastify.get(
        "/auth/me",
        {
            preHandler: [fastify.verifyAdmin]
        },
        async (request) => {
            return ok(request.adminUser!, "success");
        }
    );

    fastify.post(
        "/auth/change-password",
        { preHandler: [fastify.verifyAdmin] },
        async (request) => {
            const body = changePasswordSchema.parse(request.body);
            const profile = await fastify.services.auth.changePassword(
                request.adminUser!.id,
                body
            );
            return ok(profile, "password changed");
        }
    );

    fastify.post(
        "/auth/logout",
        {
            preHandler: [fastify.verifyAdmin]
        },
        async (_request, reply) => {
            reply.clearCookie(env.authCookieName, {
                path: "/"
            });

            return ok({ ok: true }, "logout success");
        }
    );

}