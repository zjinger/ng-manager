import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { env } from "../../env";
import {
    changePasswordSchema,
    loginSchema,
    updateAccountProfileSchema
} from "../../modules/auth/auth.schema";
import { AppError } from "../../utils/app-error";
import { cleanupTempFiles, parseMultipartUpload } from "../../utils/multipart";
import { ok } from "../../utils/response";

export default async function adminAuthRoutes(fastify: FastifyInstance) {
    fastify.get("/auth/login/challenge", async () => {
        const challenge = fastify.services.auth.issueLoginChallenge();
        return ok(challenge, "challenge issued");
    });

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
            secure: env.authCookieSecure,
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

    fastify.get(
        "/auth/profile",
        {
            preHandler: [fastify.verifyAdmin]
        },
        async (request) => {
            const profile = fastify.services.auth.getAccountProfile(request.adminUser!.id);
            return ok(profile, "success");
        }
    );

    fastify.patch(
        "/auth/profile",
        {
            preHandler: [fastify.verifyAdmin]
        },
        async (request) => {
            const body = updateAccountProfileSchema.parse(request.body);
            const profile = fastify.services.auth.updateAccountProfile(request.adminUser!.id, body);
            return ok(profile, "profile updated");
        }
    );

    fastify.get(
        "/auth/avatar",
        {
            preHandler: [fastify.verifyAdmin]
        },
        async (request, reply) => {
            const avatar = fastify.services.auth.getAccountAvatar(request.adminUser!.id);
            if (avatar.storageProvider === "local" && !fs.existsSync(avatar.storagePath)) {
                throw new AppError("AUTH_AVATAR_NOT_FOUND", "未找到头像文件", 404);
            }

            reply.header("Cache-Control", "no-store");
            reply.header("Content-Type", avatar.mimeType || "application/octet-stream");
            return reply.send(fs.createReadStream(avatar.storagePath));
        }
    );

    fastify.post(
        "/auth/avatar",
        {
            preHandler: [fastify.verifyAdmin]
        },
        async (request) => {
            const { files } = await parseMultipartUpload(request);
            if (!files.length) {
                throw new AppError("AUTH_AVATAR_NO_FILE", "请选择头像文件", 400);
            }

            try {
                const avatarFile = files[0];
                if (!avatarFile) {
                    throw new AppError("AUTH_AVATAR_NO_FILE", "请选择头像文件", 400);
                }

                const profile = fastify.services.auth.uploadAccountAvatar(request.adminUser!.id, {
                    originalName: avatarFile.originalName,
                    mimeType: avatarFile.mimeType,
                    fileSize: avatarFile.fileSize,
                    tempFilePath: avatarFile.tempFilePath
                });
                return ok(profile, "avatar updated");
            } finally {
                await cleanupTempFiles(files);
            }
        }
    );

    fastify.delete(
        "/auth/avatar",
        {
            preHandler: [fastify.verifyAdmin]
        },
        async (request) => {
            const profile = fastify.services.auth.clearAccountAvatar(request.adminUser!.id);
            return ok(profile, "avatar cleared");
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
