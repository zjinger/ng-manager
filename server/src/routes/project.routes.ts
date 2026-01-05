import type { FastifyInstance } from "fastify";
import * as fs from "fs";
import * as path from "path";

/**
 * Project routes
 */
export default async function projectRoutes(fastify: FastifyInstance) {
    /**
    * 列出所有项目
    * POST /list
    */
    fastify.get("/list", async () => {
        const projects =  await fastify.core.project.list();
        console.log('[List Projects]', projects);
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
        const body = req.body as {
            mode: "create" | "import";
            rootPath: string;
        };

        const root = path.resolve(body.rootPath).replace(/[\\/]+$/, "");
        if (!root) {
            return {
                ok: false,
                exists: false,
                isDir: false,
                alreadyRegistered: false,
                message: "rootPath is empty",
            };
        }

        let stat: fs.Stats | null = null;
        try {
            stat = fs.statSync(root);
        } catch { }

        const exists = !!stat;
        const isDir = !!stat && stat.isDirectory();

        const existedProject = await fastify.core.project
            .scan(root) // 只是 scan，不创建
            .then(() => fastify.core.project.list())
            .then(list => list.find(p => p.root === root))
            .catch(() => null);

        const alreadyRegistered = !!existedProject;

        if (body.mode === "import") {
            if (!exists) {
                return {
                    ok: false,
                    exists,
                    isDir,
                    alreadyRegistered,
                    message: "Import path does not exist",
                };
            }
            if (!isDir) {
                return {
                    ok: false,
                    exists,
                    isDir,
                    alreadyRegistered,
                    message: "Import path must be a directory",
                };
            }
        }

        return {
            ok: true,
            exists,
            isDir,
            alreadyRegistered,
        };
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
            framework: meta.framework ?? "Unknown",
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
     * 创建 / 导入项目
     */
    fastify.post("/new", async (req, reply) => {
        const body = req.body as {
            mode: "create" | "import";
            name: string;
            root: string;
            scripts?: Record<string, string>;
            syncTasks?: boolean;
        };
        const project = await fastify.core.project.create({
            name: body.name,
            root: body.root,
            scripts: body.scripts,
        });

        let syncedSpecs: any[] | undefined;

        // 创建后默认同步 scripts → task specs
        if (body.syncTasks !== false) {
            syncedSpecs = await fastify.core.task.syncSpecsFromProjectScripts(
                project.id,
                project.root,
                project.scripts ?? {}
            );
        }
        return {
            projectId: project.id,
            syncedSpecs,
        };

    });


}
