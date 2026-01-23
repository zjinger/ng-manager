import { AppError } from "@core";
import type { ConfigFileType, ConfigPatch } from "@core/domain/config";
import type { FastifyInstance } from "fastify";
import { openFolder } from "../common/editor";
type QueryBase = {
    relPath?: string;
    type: ConfigFileType
};

type ViewModelQuery = QueryBase & {
    project?: string;
    target?: string;
    configuration?: string;
};

type DiffBody = {
    type: ConfigFileType;
    patch: ConfigPatch;
};

type ApplyBody = DiffBody & {
    force?: string | boolean; // ?force=1  force=1 | true → 覆盖保存 ;未传 or force=0 → 默认安全模式
};

export default async function configRoutes(fastify: FastifyInstance) {

    /**
     * 返回配置目录树 + 各文件 Schema
     */
    // fastify.get("/catalog/:projectId", async (req) => {
    //     return fastify.core.config.getCatalogDoc((req.params as { projectId: string }).projectId);
    // });

    /**
     * 返回配置文件树结构
     */
    fastify.get("/tree/:projectId", async (req) => {
        return fastify.core.config.getTree((req.params as { projectId: string }).projectId);
    });

    /**
     * 返回配置文件 Schema
     * - 用于 Raw JSON 编辑时的校验
     */
    fastify.get<{ Querystring: QueryBase }>("/schema/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string; type: ConfigFileType };
        const { type } = req.query;
        return await fastify.core.config.getSchema(projectId, type);
    });

    /**
     * 返回原始 workspace（用于 Raw JSON 编辑/预览）
     */
    fastify.get<{ Querystring: QueryBase }>("/workspace/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const { relPath, type } = req.query;
        return await fastify.core.config.getWorkspace(projectId, {
            type,
            relPath
        });
    });


    /**
     * 返回 UI ViewModel（表单模式用）
     */
    fastify.get<{ Querystring: ViewModelQuery }>("/view-model/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const { project, type, target, configuration } = req.query;
        return await fastify.core.config.getViewModel(projectId, {
            type,
            project,
            target,
            configuration
        });
    });


    /**
     * Diff 预览（不落盘）
     */
    fastify.post<{ Body: DiffBody }>("/diff/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const { type, patch } = req.body;
        if (!projectId || !type) {
            throw new AppError("BAD_REQUEST", "projectId and type are required");
        }
        return await fastify.core.config.diff(projectId, patch, { type })
    });

    /**
     * Apply 保存（落盘，原子写入）
     */
    fastify.post<{ Body: ApplyBody }>("/apply/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        const { force, type, patch } = req.body;
        if (!projectId || !type) {
            throw new AppError("BAD_REQUEST", "projectId and type are required");
        }
        return await fastify.core.config.apply(projectId, patch, { type, force: force === "1" || force === "true" || force === true });
    });

    /**
     * Reset（可选）
     * - 这里的 reset 先做成“重新读取文件返回最新 workspace”
     * - 真正的“重置为模板”后面再加（未来可选项）
     */
    // fastify.post<{ Body: { type?: string; projectRoot: string } }>("/reset", async (req) => {
    //     const { projectRoot, type } = req.body;
    //     if (!projectRoot) throw new AppError("BAD_REQUEST", "projectRoot is required");
    // const provider = getProvider(type);

    // const workspace = await provider.load(projectRoot);
    // validateWorkspace(workspace);

    // return {
    //     filePath: workspace.filePath,
    //     raw: workspace.raw,
    // };
    // });

    // GET catalog
    fastify.get("/catalog/:projectId", async (req) => {
        const { projectId } = req.params as { projectId: string };
        return await fastify.core.config.getCatalog(projectId);
    });

    // GET doc
    fastify.get("/readDoc/:projectId/:docId", async (req) => {
        const { projectId, docId } = req.params as { projectId: string; docId: string };
        return await fastify.core.config.readDoc(projectId, docId);
    });

    // PUT doc
    fastify.post("/writeDoc/:projectId/:docId", async (req) => {
        const { projectId, docId } = req.params as { projectId: string; docId: string };
        const body = req.body as any;

        // 约定：raw 优先，其次 data
        const next = body?.raw ?? body?.data;
        if (next === undefined) {
            throw new AppError("CONFIG_WRITE_FAILED", "missing body.raw or body.data", { projectId, docId });
        }
        return await fastify.core.config.writeDoc(projectId, docId, next);
    });

    /**
        * 在编辑器打开项目
        * POST /projects/openInEditor/:projectId
        * body: { editor?: "code" | "system" }
        */
    fastify.post("/openInEditor/:projectId/:docId", async (req) => {
        try {
            const { projectId, docId } = req.params as { projectId: string; docId: string };
            const { filePath } = await fastify.core.config.openDoc(projectId, docId);
            await openFolder(filePath, { editor: 'code' });
            return { ok: true };
        } catch (e: any) {
            throw new AppError("EDITOR_LAUNCH_FAILED", e?.message || "openInEditor failed");
        }
    });

}
