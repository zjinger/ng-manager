import { fastify, type FastifyInstance } from "fastify";
import * as path from "path";
import launchEditor from "launch-editor";
import { AppError } from "@core";
import { OpenFolderOptions } from "@core/domain/editor";
async function openFolder(folder: string, fastify: FastifyInstance, opts: OpenFolderOptions = {}): Promise<void> {
    const editor = opts.editor ?? "code";
    const file = opts.file;

    const target = file
        ? path.resolve(folder, file)
        : path.resolve(folder);

    return new Promise<void>((resolve, reject) => {
        let settled = false;

        // 兜底：避免 callback 不触发导致请求永远挂起
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve();
        }, 200);

        launchEditor(
            target,
            editor === "system" ? undefined : editor,
            (fileName, errorMsg) => {
                fastify.log.info(`launchEditor callback invoked: file=${fileName}, error=${errorMsg}`);
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (errorMsg) {
                    reject(new AppError("EDITOR_NOT_FOUND", errorMsg, { editor, folder, file, target }));
                    return;
                }
                resolve();
            }
        );
    });
}
/**
 * Project routes
 */
export default async function projectRoutes(fastify: FastifyInstance) {
    /**
    * 列出所有项目
    * POST /list
    */
    fastify.get("/list", async () => {
        const projects = await fastify.core.project.list();
        return projects;
    });

    /**
    * 更新项目（编辑）
    */
    fastify.post("/update/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = req.body as Partial<{
            name: string;
            env: Record<string, string>;
            scripts: Record<string, string>;
        }>;
        try {
            // 明确禁止修改的字段
            if ((body as any).root) {
                reply.code(400);
                return { message: "root is immutable" };
            }
            const updated = await fastify.core.project.update(id, {
                ...(body.name !== undefined ? { name: body.name } : {}),
                ...(body.env !== undefined ? { env: body.env } : {}),
                ...(body.scripts !== undefined ? { scripts: body.scripts } : {}),
            });
            return updated;
        } catch (err) {
            if (err instanceof Error) {
                reply.code(400);
                return { message: err.message };
            }
        }
    });

    /**
     * 获取项目详情
     */
    fastify.get("/getInfo/:id", async (req,) => {
        const { id } = req.params as { id: string };
        const project = await fastify.core.project.get(id);
        return project;
    });

    /**
     * 删除项目
     */
    fastify.get("/delete/:id", async (req) => {
        const { id } = req.params as { id: string };
        await fastify.core.project.remove(id);
        return { id };
    });

    /**
     * 检查路径是否合法 / 是否已存在项目
     */
    fastify.post("/check", async (req) => {
        const body = req.body as { rootPath: string };
        return fastify.core.project.checkRoot(body.rootPath);
    });

    /**
     * 扫描项目（只读）
     * POST /detect
     */
    fastify.post("/detect", async (req) => {
        const body = req.body as { rootPath: string };
        const root = path.resolve(body.rootPath);

        // 直接复用 core.project.scan
        const meta = await fastify.core.project.scan(root);

        return {
            framework: meta.framework ?? "unknown",
            hasPackageJson: !!meta.scripts && Object.keys(meta.scripts).length > 0,
            scripts: meta.scripts ?? {},
            recommendedScript:
                meta.scripts?.dev
                    ? "dev"
                    : meta.scripts?.start
                        ? "start"
                        : Object.keys(meta.scripts ?? {})[0],
            hasGit: meta.hasGit ?? false,
        };
    });

    /**
     * 导入已有项目
     */
    fastify.post("/import", async (req) => {
        const body = req.body as {
            root: string;
            name?: string;
            syncTasks?: boolean;
        };
        const project = await fastify.core.project.importProject({
            root: body.root,
            name: body.name,
        });
        // 要自动 sync task，这里加
        if (body.syncTasks === true) {
            await fastify.core.task.syncSpecsFromProjectScripts(
                project.id,
                project.root,
                project.scripts ?? {}
            );
        }
        return {
            id: project.id,
        };
    });

    /**
     * 检查 root 是否是一个可导入的项目
     */
    fastify.post("/checkImport", async (req) => {
        const body = req.body as { root: string };
        return fastify.core.project.checkImport(body.root);
    });

    /**
     * 创建新项目（暂不接 scaffold） 
     */
    fastify.post("/create", async (req) => {
        // const body = req.body as {
        //     name: string;
        //     root: string;
        //     scripts?: Record<string, string>;
        //     syncTasks?: boolean;
        // };

        // const chk = await fastify.core.project.checkRoot(body.root);
        // if (!chk.ok) return chk;

        // const project = await fastify.core.project.create({
        //     name: body.name,
        //     root: chk.root,
        //     scripts: body.scripts,
        // });

        // let syncedSpecs: any[] | undefined;
        // if (body.syncTasks === true) {
        //     syncedSpecs = await fastify.core.task.syncSpecsFromProjectScripts(
        //         project.id,
        //         project.root,
        //         project.scripts ?? {}
        //     );
        // }
        // return { id: project.id, syncedSpecs };
        const body = req.body as {
            name: string;
            root: string;
        };
        const project = await fastify.core.project.create({
            name: body.name,
            root: body.root,
        });
        return { id: project.id };
    });


    /**
     * 设置收藏
     * POST /projects/favorite/:id
     * body: { isFavorite: boolean }
     */
    fastify.post("/favorite/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = req.body as { isFavorite?: boolean };
        if (typeof body?.isFavorite !== "boolean") {
            reply.code(400);
            return { message: "isFavorite must be boolean" };
        }
        const updated = await fastify.core.project.setFavorite(id, body.isFavorite);
        return updated;
    });

    /**
     * 切换收藏
     * POST /projects/favorite/:id/toggle
     */
    fastify.post("/favorite/:id/toggle", async (req) => {
        const { id } = req.params as { id: string };
        const updated = await fastify.core.project.toggleFavorite(id);
        return updated;
    });

    fastify.post("/lastOpened/:id", async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as { timestamp: number };
        if (typeof body?.timestamp !== "number") {
            throw new AppError("INVALID_TIMESTAMP", "timestamp must be a number");
        }
        const updated = await fastify.core.project.setLastOpened(id, body.timestamp);
        return updated;
    });

    fastify.post("/rename/:id", async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as { name: string };
        if (typeof body?.name !== "string" || body.name.trim() === "") {
            throw new AppError("INVALID_NAME", "name must be a non-empty string");
        }
        const updated = await fastify.core.project.rename(id, body.name.trim());
        return updated;
    })


    /**
     * 在编辑器打开项目
     * POST /projects/openInEditor/:id
     * body: { editor?: "code" | "system" }
     */
    fastify.post("/openInEditor/:id", async (req) => {
        try {
            const { id } = req.params as { id: string };
            const body = req.body as { editor?: "code" | "system" };
            const p = await fastify.core.project.get(id);
            const editor = body?.editor || "code";
            await openFolder(p.root, fastify, { editor });
            return { ok: true };
        } catch (e: any) {
            throw new AppError("EDITOR_LAUNCH_FAILED", e?.message || "openInEditor failed");
        }

        // await fastify.core.project.openInEditor(id, { editor: body?.editor });
    });
}

