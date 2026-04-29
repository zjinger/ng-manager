import { GlobalError, GlobalErrorCodes, CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type {
    CheckProjectRootRequestDto,
    CreateProjectRequestDto,
    DetectProjectRequestDto,
    EditProjectRequestDto,
    ImportProjectRequestDto,
    OpenProjectInEditorRequestDto,
    ProjectAssetsDto,
    ProjectAssetSourceSvnDto,
    ProjectDto,
    ProjectImportCheckResponseDto,
    RenameProjectRequestDto,
    SetProjectFavoriteRequestDto,
    SetProjectLastOpenedRequestDto,
    UpdateProjectAssetsRequestDto,
    UpdateProjectRequestDto,
} from "@yinuo-ngm/protocol";
import type {
    CheckRootResult,
    DetectResult,
    ImportCheckResult,
    Project,
    ProjectAssets,
    ProjectAssetSourceSvn,
} from "@yinuo-ngm/project";
import { type FastifyInstance } from "fastify";
import * as path from "path";
import { openFolder } from "../common/editor";

function toProjectAssetSourceSvnDto(source: ProjectAssetSourceSvn): ProjectAssetSourceSvnDto {
    return {
        kind: source.kind,
        id: source.id,
        label: source.label,
        url: source.url,
        localDir: source.localDir,
        mode: source.mode,
    };
}

function toProjectAssetsDto(assets?: ProjectAssets): ProjectAssetsDto | undefined {
    if (!assets) return undefined;
    return {
        iconsSvn: assets.iconsSvn ? toProjectAssetSourceSvnDto(assets.iconsSvn) : undefined,
        cutImageSvn: assets.cutImageSvn ? toProjectAssetSourceSvnDto(assets.cutImageSvn) : undefined,
    };
}

function toProjectDto(project: Project): ProjectDto {
    return {
        id: project.id,
        name: project.name,
        description: (project as Project & { description?: string }).description,
        root: project.root,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        scripts: project.scripts,
        packageManager: project.packageManager,
        framework: project.framework,
        env: project.env,
        isFavorite: project.isFavorite,
        lastOpened: project.lastOpened,
        repoUrl: project.repoUrl,
        repoPageUrl: project.repoPageUrl,
        assets: toProjectAssetsDto(project.assets),
    };
}

function toDetectResultDto(detect?: DetectResult) {
    if (!detect) return undefined;
    return {
        framework: detect.framework,
        hasPackageJson: detect.hasPackageJson,
        scripts: detect.scripts,
        scriptsCount: detect.scriptsCount,
        recommendedScript: detect.recommendedScript,
        lockFile: detect.lockFile,
        hasGit: detect.hasGit,
        hasMakefile: detect.hasMakefile,
        hasDockerCompose: detect.hasDockerCompose,
    };
}

function toImportCheckResultDto(result: ImportCheckResult): ProjectImportCheckResponseDto {
    return {
        ok: result.ok,
        root: result.root,
        code: result.code,
        reason: result.reason,
        detect: toDetectResultDto(result.detect),
        warnings: result.warnings,
    };
}

function toCheckRootResultDto(result: CheckRootResult) {
    return {
        ok: result.ok,
        root: result.root,
        exists: result.exists,
        isDir: result.isDir,
        alreadyRegistered: result.alreadyRegistered,
        message: result.message,
    };
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
        return projects.map(toProjectDto);
    });

    /**
    * 更新项目（编辑）
    */
    fastify.post("/update/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = req.body as Partial<UpdateProjectRequestDto>;
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
            return toProjectDto(updated);
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
        return toProjectDto(project);
    });

    /**
     * 删除项目
     */
    fastify.delete("/delete/:id", async (req) => {
        const { id } = req.params as { id: string };
        await fastify.core.project.remove(id);
        return { id };
    });

    /**
     * 检查路径是否合法 / 是否已存在项目
     */
    fastify.post("/check", async (req) => {
        const body = req.body as CheckProjectRootRequestDto;
        const result = await fastify.core.project.checkRoot(body.rootPath);
        return toCheckRootResultDto(result);
    });

    /**
     * 扫描项目（只读）
     * POST /detect
     */
    fastify.post("/detect", async (req) => {
        const body = req.body as DetectProjectRequestDto;
        const root = path.resolve(body.rootPath);

        // 直接复用 core.project.scan
        const meta = await fastify.core.project.scan(root);

        return {
            framework: meta.framework ?? "unknown",
            hasPackageJson: !!meta.scripts && Object.keys(meta.scripts).length > 0,
            scripts: Object.keys(meta.scripts ?? {}),
            scriptsCount: Object.keys(meta.scripts ?? {}).length,
            recommendedScript:
                meta.scripts?.dev
                    ? "dev"
                    : meta.scripts?.start
                        ? "start"
                        : Object.keys(meta.scripts ?? {})[0],
            hasGit: meta.hasGit ?? false,
            hasMakefile: meta.hasMakefile ?? false,
            hasDockerCompose: meta.hasDockerCompose ?? false,
        };
    });

    /**
     * 导入已有项目
     */
    fastify.post("/import", async (req) => {
        const body = req.body as ImportProjectRequestDto;
        const project = await fastify.core.project.importProject({
            root: body.root,
            name: body.name,
        });
        // 要自动 sync task，这里加
        if (body.syncTasks === true) {
            await fastify.core.task.refreshByProject(project.id);
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
        const result = await fastify.core.project.checkImport(body.root);
        return toImportCheckResultDto(result);
    });

    /**
     * 创建新项目（暂不接 scaffold） 
     */
    fastify.post("/create", async (req) => {
        const body = req.body as CreateProjectRequestDto;
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
        const body = req.body as Partial<SetProjectFavoriteRequestDto>;
        if (typeof body?.isFavorite !== "boolean") {
            reply.code(400);
            return { message: "isFavorite must be boolean" };
        }
        const updated = await fastify.core.project.setFavorite(id, body.isFavorite);
        return toProjectDto(updated);
    });

    /**
     * 切换收藏
     * POST /projects/favorite/:id/toggle
     */
    fastify.post("/favorite/:id/toggle", async (req) => {
        const { id } = req.params as { id: string };
        const updated = await fastify.core.project.toggleFavorite(id);
        return toProjectDto(updated);
    });

    fastify.post("/lastOpened/:id", async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as SetProjectLastOpenedRequestDto;
        if (typeof body?.timestamp !== "number") {
            throw new GlobalError(GlobalErrorCodes.INVALID_TIMESTAMP, "timestamp must be a number");
        }
        const updated = await fastify.core.project.setLastOpened(id, body.timestamp);
        return toProjectDto(updated);
    });

    fastify.post("/rename/:id", async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as RenameProjectRequestDto;
        if (typeof body?.name !== "string" || body.name.trim() === "") {
            throw new CoreError(CoreErrorCodes.INVALID_NAME, "name must be a non-empty string");
        }
        const updated = await fastify.core.project.rename(id, body.name.trim());
        return toProjectDto(updated);
    })

    /**
     * 刷新项目 scripts（重新扫描 package.json）
     */
    fastify.post("/refreshScripts/:id", async (req) => {
        const { id } = req.params as { id: string };
        const updated = await fastify.core.project.refreshScripts(id);
        return toProjectDto(updated);
    })
    fastify.post("/edit/:id", async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as EditProjectRequestDto;
        if (typeof body?.name !== "string" || body.name.trim() === "") {
            throw new CoreError(CoreErrorCodes.INVALID_NAME, "name must be a non-empty string");
        }
        const updated = await fastify.core.project.edit(id, {
            name: body.name.trim(),
            description: body.description?.trim(),
            repoPageUrl: body.repoPageUrl?.trim(),
        });
        return toProjectDto(updated);
    })

    fastify.post("/updateAssets/:id", async (req) => {
        const { id } = req.params as { id: string };
        const body = req.body as UpdateProjectAssetsRequestDto;
        const assets = body?.assets as ProjectAssets | undefined;
        if (!assets || !assets.iconsSvn) {
            throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "参数错误，assets.iconsSvn 是必需的");
        }
        const updated = await fastify.core.project.updateAssets(id, assets);
        return toProjectDto(updated);
    });

    /**
     * 在编辑器打开项目
     * POST /projects/openInEditor/:id
     * body: { editor?: "code" | "system" }
     */
    fastify.post("/openInEditor/:id", async (req) => {
        try {
            const { id } = req.params as { id: string };
            const body = req.body as OpenProjectInEditorRequestDto;
            const p = await fastify.core.project.get(id);
            const editor = body?.editor || "code";
            await openFolder(p.root, { editor });
            return {};
        } catch (e: any) {
            throw new CoreError(CoreErrorCodes.EDITOR_LAUNCH_FAILED, e?.message || "openInEditor failed");
        }
    });

    fastify.post("/bootstrap/cli", async (req) => {
        const body = req.body as any;
        return await fastify.core.bootstrap.bootstrapByCli(body);
    });

    fastify.post("/bootstrap/git", async (req) => {
        const body = req.body as any;
        return await fastify.core.bootstrap.bootstrapByGit(body);
    });

    fastify.post("/bootstrap/pickRoot", async (req) => {
        const body = req.body as any;
        const taskId = String(body?.taskId ?? "").trim();
        const pickedRoot = String(body?.pickedRoot ?? "").trim();
        if (!taskId) throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "taskId is required");
        if (!pickedRoot) throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "pickedRoot is required");
        const r = await fastify.core.bootstrap.pickWorkspaceRoot({ taskId, pickedRoot });
        return r;
    });
}

