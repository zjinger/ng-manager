import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type { BrowseEntriesDto, BrowseFilesDto } from "@yinuo-ngm/protocol";

const SKIP = new Set([
    ".svn",
    ".git",
    ".hg",
    ".DS_Store",
    "__MACOSX",
    "Thumbs.db",
]);

function safeJoin(root: string, sub: string) {
    const resolved = path.resolve(root, sub);
    const rootResolved = path.resolve(root);
    if (!resolved.startsWith(rootResolved)) {
        throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "INVALID_PATH");
    }
    return resolved;
}

function listDir(root: string): Array<{ name: string; kind: "dir" | "file"; ext: string | undefined }> {
    if (!fs.existsSync(root)) return [];
    return fs
        .readdirSync(root, { withFileTypes: true })
        .filter(d => !SKIP.has(d.name) && !d.name.startsWith("."))
        .map(d => ({
            name: d.name,
            kind: (d.isDirectory() ? "dir" : "file") as "dir" | "file",
            ext: d.isDirectory() ? undefined : path.extname(d.name).toLowerCase(),
        })).sort((a, b) => {
            if (a.kind === b.kind) {
                return a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true });
            }
            return a.kind === "dir" ? -1 : 1;
        });
}

function countFiles(dir: string) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return 0;
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile()).length;
}

function toBrowseEntriesDto(root: string, entries: BrowseEntriesDto["entries"]): BrowseEntriesDto {
    return { root, entries };
}

function toBrowseFilesDto(root: string, dir: string | undefined, entries: BrowseFilesDto["entries"]): BrowseFilesDto {
    return { root, dir, entries };
}

export default async function spriteBrowseRoutes(fastify: FastifyInstance) {
    fastify.get<{ Params: { projectId: string } }>(
        "/icons/groups/:projectId",
        async (req) => {
            const { projectId } = req.params;
            const project = await fastify.core.project.get(projectId);
            const cfg = await fastify.core.sprite.getConfig(projectId);
            const localRoot = String(cfg?.localImageRoot ?? "").trim();
            const root = localRoot || project?.assets?.iconsSvn?.localDir;
            if (!root) {
                return toBrowseEntriesDto("", []);
            }
            const entries = listDir(root).filter(e => e.kind === "dir");
            if (localRoot) {
                const rootFiles = listDir(root).filter((e) => e.kind === "file" && (e.ext === ".png" || e.ext === ".svg"));
                if (rootFiles.length > 0) {
                    entries.unshift({ name: "root", kind: "dir", ext: undefined });
                }
            }
            return toBrowseEntriesDto(root, entries);
        }
    );

    fastify.get<{ Params: { projectId: string }; Querystring: { group?: string } }>(
        "/icons/files/:projectId",
        async (req) => {
            const { projectId } = req.params;
            const group = req.query?.group;
            const project = await fastify.core.project.get(projectId);
            const cfg = await fastify.core.sprite.getConfig(projectId);
            const localRoot = String(cfg?.localImageRoot ?? "").trim();
            const root = localRoot || project?.assets?.iconsSvn?.localDir;
            if (!root) {
                return toBrowseEntriesDto("", []);
            }
            const isRootGroup = !!localRoot && (group === "root");
            const groupDir = isRootGroup ? root : safeJoin(root, group || "");
            const entries = listDir(groupDir)
                .filter(e => e.kind === "file")
                .map(e => ({
                    ...e,
                    url: localRoot
                        ? `/api/static/local/${projectId}/${isRootGroup ? e.name : `${group}/${e.name}`}`
                        : `/api/static/svn/${projectId}/icons/${group}/${e.name}`,
                }));

            return toBrowseEntriesDto(groupDir, entries);
        }
    );

    fastify.get<{ Params: { projectId: string }; Querystring: { dir?: string } }>(
        "/images/list/:projectId",
        async (req) => {
            const { projectId } = req.params;
            const project = await fastify.core.project.get(projectId);
            const root = project?.assets?.cutImageSvn?.localDir;
            if (!root) {
                return toBrowseEntriesDto("", []);
            }
            const dir = String(req.query?.dir ?? "").trim();
            if (dir.split(/[\\/]/g).some(seg => seg === "..")) {
                return toBrowseFilesDto(root, "", []);
            }
            const absDir = dir ? safeJoin(root, dir) : root;
            if (!fs.existsSync(absDir)) return toBrowseFilesDto(root, dir, []);
            const entries = listDir(absDir).map(e => {
                if (e.kind === "file") {
                    const rel = dir ? `${dir}/${e.name}` : e.name;
                    return {
                        ...e,
                        url: `/api/static/svn/${projectId}/images/${rel}`,
                    };
                } else if (e.kind === "dir") {
                    const rel = dir ? `${dir}/${e.name}` : e.name;
                    return {
                        ...e,
                        fileCount: countFiles(safeJoin(root, rel)),
                    };
                }
                return e;
            });

            return toBrowseFilesDto(root, dir, entries);
        }
    );
}
