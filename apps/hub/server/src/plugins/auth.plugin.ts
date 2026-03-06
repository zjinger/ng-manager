import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";
import { AppError } from "../utils/app-error";
import type { JwtAdminPayload } from "../modules/auth/auth.types";

export default fp(async function authPlugin(fastify) {
    await fastify.register(cookie);

    await fastify.register(jwt, {
        secret: env.jwtSecret,
        cookie: {
            cookieName: env.authCookieName,
            signed: false
        },
        sign: {
            expiresIn: env.authTokenExpiresIn
        }
    });

    fastify.decorateRequest("adminUser", null);

    fastify.decorate(
        "verifyAdmin",
        async function verifyAdmin(request: FastifyRequest, _reply: FastifyReply) {
            try {
                await request.jwtVerify<JwtAdminPayload>();
            } catch {
                throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
            }

            const payload = request.user as JwtAdminPayload | undefined;
            if (!payload?.sub) {
                throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
            }

            const profile = fastify.services.auth.getProfileById(payload.sub);
            request.adminUser = profile;
        }
    );
});