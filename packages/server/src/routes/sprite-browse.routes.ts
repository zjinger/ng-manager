import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";

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
        throw new Error("INVALID_PATH");
    }
    return resolved;
}

function listDir(root: string) {
    if (!fs.existsSync(root)) return [];
    return fs
        .readdirSync(root, { withFileTypes: true })
        .filter(d => !SKIP.has(d.name) && !d.name.startsWith("."))
        .map(d => ({
            name: d.name,
            kind: d.isDirectory() ? "dir" : "file",
            ext: d.isDirectory() ? undefined : path.extname(d.name).toLowerCase(),
        })).sort((a, b) => {
            // 目录在前，文件在后；同类型按名称排序
            if (a.kind === b.kind) {
                return a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true });
            }
            return a.kind === "dir" ? -1 : 1;
        });
}

// 统计dir下的文件数量（不递归），用于显示在目录旁边
function countFiles(dir: string) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return 0;
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile()).length;
}

export default async function spriteBrowseRoutes(fastify: FastifyInstance) {

    // 浏览 icons 分组
    fastify.get("/icons/groups/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const project = await fastify.core.project.get(projectId);
        const root = project?.assets?.iconsSvn?.localDir;
        if (!root) {
            return { root: "", entries: [] };
        }
        return { root, entries: listDir(root).filter(e => e.kind === "dir") };
    });

    // 浏览 icons group 下文件
    fastify.get("/icons/files/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const group = (req.query as { group?: string })?.group;
        const project = await fastify.core.project.get(projectId);
        const root = project?.assets?.iconsSvn?.localDir;
        if (!root) {
            return { root: "", entries: [] };
        }
        const groupDir = safeJoin(root, group || '');
        const entries = listDir(groupDir)
            .filter(e => e.kind === "file")
            .map(e => ({
                ...e,
                url: `/api/static/svn/${projectId}/icons/${group}/${e.name}`,
            }));

        return { root: groupDir, entries };
    });

    // 浏览 images
    fastify.get("/images/list/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const project = await fastify.core.project.get(projectId);
        const root = project?.assets?.cutImageSvn?.localDir;
        if (!root) {
            return { root: "", entries: [] };
        }
        const dir = String((req.query as { dir?: string })?.dir ?? "").trim(); // 相对 imagesRoot 的子目录
        // dir 里禁止 ..，避免穿越
        if (dir.split(/[\\/]/g).some(seg => seg === "..")) {
            return { root, dir: "", entries: [] };
        }
        const absDir = dir ? safeJoin(root, dir) : root;
        if (!fs.existsSync(absDir)) return { root, dir, entries: [] };
        const entries = listDir(absDir).map(e => {
            if (e.kind === "file") {
                const rel = dir ? `${dir}/${e.name}` : e.name;
                return {
                    ...e,
                    url: `/api/static/svn/${projectId}/images/${rel}`,
                }
            } else if (e.kind === "dir") {
                // 目录的话顺便统计一下文件数量，显示在目录旁边
                const rel = dir ? `${dir}/${e.name}` : e.name;
                return {
                    ...e,
                    fileCount: countFiles(safeJoin(root, rel))
                }
            }
            return e
        })

        return { root, dir, entries };
    });
}