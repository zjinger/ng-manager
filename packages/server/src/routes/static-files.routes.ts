import { GlobalError, GlobalErrorCodes, CoreError, CoreErrorCodes } from "@yinuo-ngm/core";
import type { FastifyInstance } from "fastify";
import mime from "mime-types";
import fs, { createReadStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

function safeJoin(root: string, sub: string) {
    const resolved = path.resolve(root, sub);
    const rootResolved = path.resolve(root);
    if (!resolved.startsWith(rootResolved)) {
        throw new Error("INVALID_PATH");
    }
    return resolved;
}

export default async function staticFileRoutes(fastify: FastifyInstance) {

    // sprite cache 文件访问
    fastify.get("/cache/sprites/:projectId/*", async (req, reply) => {
        const { projectId } = req.params as any;
        const file = (req.params as any)["*"];

        const cacheDir = fastify.core.sprite.ensureCacheDir(projectId);
        const filePath = safeJoin(cacheDir, file);

        if (!fs.existsSync(filePath)) {
            throw new GlobalError(GlobalErrorCodes.NOT_FOUND, "Requested file not found in cache");
        }
        // await pipeline(createReadStream(filePath), reply.raw);
        const ct = mime.lookup(filePath) || "application/octet-stream";
        reply.header("Content-Type", ct);
        return reply.send(createReadStream(filePath));
    });

    // svn 文件访问
    fastify.get("/svn/:projectId/:kind/*", async (req, reply) => {
        const { projectId, kind } = req.params as any;
        const file = (req.params as any)["*"];

        const project = await fastify.core.project.get(projectId);
        const root =
            kind === "icons"
                ? project?.assets?.iconsSvn?.localDir
                : project?.assets?.cutImageSvn?.localDir;
        if (!root) {
            throw new CoreError(CoreErrorCodes.ASSET_NOT_FOUND, "Project asset source not found");
        }

        const filePath = safeJoin(root, file);
        if (!fs.existsSync(filePath)) {
            throw new GlobalError(GlobalErrorCodes.NOT_FOUND, "Requested file not found in SVN");
        }
        const ct = mime.lookup(filePath) || "application/octet-stream";
        reply.header("Content-Type", ct);
        // await pipeline(createReadStream(filePath), reply.raw);
        return reply.send(createReadStream(filePath));
        // return reply;
    });

    // localImageRoot 文件访问
    fastify.get("/local/:projectId/*", async (req, reply) => {
        const { projectId } = req.params as any;
        const file = (req.params as any)["*"];

        const cfg = await fastify.core.sprite.getConfig(projectId);
        const root = String(cfg?.localImageRoot ?? "").trim();
        if (!root) {
            throw new CoreError(CoreErrorCodes.ASSET_NOT_FOUND, "localImageRoot not configured");
        }

        const filePath = safeJoin(root, file);
        if (!fs.existsSync(filePath)) {
            throw new GlobalError(GlobalErrorCodes.NOT_FOUND, "Requested file not found in local folder");
        }
        const ct = mime.lookup(filePath) || "application/octet-stream";
        reply.header("Content-Type", ct);
        return reply.send(createReadStream(filePath));
    });
}
