import fs from "node:fs";
import path from "node:path";
import { AppError } from "../../common/errors";
import { Project, ProjectAssetSourceSvn, ProjectService } from "../project";
import { SpriteRepo } from "./sprite.repo";
import { SpriteService } from "./sprite.service";
import { GenerateSpriteOptions, SpriteConfig, SpriteGenerateItemResult, SpriteGenerateResult } from "./sprite.types";
import { generateGroupBatch, GenerateGroupBatchItem } from "@yinuo-ngm/sprite";
import { SystemLogService } from "../logger";
export class SpriteServiceImpl implements SpriteService {
    constructor(
        private spriteRepo: SpriteRepo,
        private project: ProjectService,
        private sysLog: SystemLogService,
        private cacheDir: string
    ) {
    }

    private ensureCacheDir(projectId: string) {
        const dir = path.join(this.cacheDir, "sprites", projectId);
        ensureDir(dir);
        return dir;
    }

    async getConfig(projectId: string): Promise<SpriteConfig | null> {
        return this.spriteRepo.getByProjectId(projectId);
    }
    async createConfig(projectId: string, config: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig> {
        return this.spriteRepo.create(projectId, config);
    }
    async updateConfig(projectId: string, patch: Partial<SpriteConfig>): Promise<SpriteConfig> {
        return this.spriteRepo.update(projectId, patch);
    }
    async removeConfig(projectId: string): Promise<void> {
        return this.spriteRepo.remove(projectId);
    }

    async generate(projectId: string, options?: GenerateSpriteOptions): Promise<SpriteGenerateResult> {
        const cfg = await this.spriteRepo.getByProjectId(projectId);
        if (!cfg) throw new AppError("SPRITE_CONFIG_NOT_FOUND", `Sprite config not found for project ${projectId}`);
        const project = await this.project.get(projectId);
        if (!project) throw new AppError("PROJECT_NOT_FOUND", `Project not found: ${projectId}`);

        // 校验 icons 目录是否存在
        const iconsRoot = resolveIconsRoot(project, cfg);
        if (!fs.existsSync(iconsRoot)) {
            throw new AppError("SPRITE_ICONS_ROOT_NOT_FOUND", `iconsRoot not found: ${iconsRoot}`);
        }

        // cache outDir（只做中间产物/缓存）
        const cacheOutDir = this.ensureCacheDir(projectId);

        const concurrency = options?.concurrency ?? 1;
        const continueOnError = options?.continueOnError ?? true;
        const forceRefresh = !!options?.forceRefresh;

        const prefix = String(cfg.prefix ?? "sl").trim() || "sl";
        const algorithm = cfg.algorithm || "binary-tree";
        const persistLess = cfg.persistLess ?? true;
        const spriteUrlTpl = String(cfg.spriteUrl ?? "").trim();

        // 批量生成（只负责得到 result + lessText，不负责导出路径策略）
        const batch = await generateGroupBatch({
            iconsRoot,
            outDir: cacheOutDir,
            spriteUrlTemplate: spriteUrlTpl,
            groups: options?.groups,
            prefix,
            algorithm,
            cache: {
                enabled: true,
                forceRefresh,
                // 注意：这里让 sprite 包生成时也可产出 lessText，但不落盘到 cacheOutDir
                // 在 sprite 包里可以把 persistLess 设为 false，避免 cache 写 less；这里不强依赖
                persistLess: false,
            },
            concurrency,
            continueOnError,
            // svg 的 urlResolver：core 不一定知道 server 的静态映射，这里给个默认即可（需要时再替换）
            svgUrlResolver: ({ group, file }) => `/assets/icons/${encodeURIComponent(group)}/${encodeURIComponent(file)}`,
        });

        const items: SpriteGenerateItemResult[] = batch.items.map((it: GenerateGroupBatchItem) => {
            if (!it.ok) { return it as SpriteGenerateItemResult }
            const group = it.group;
            const kind = it.type === "png" ? "png" : "svg";
            const result = it.result;
            try {
                const lessText = result?.lessText ?? "";
                let spriteUrl: string | undefined;
                let spriteOutPath: string | undefined;

                if (kind === "png") {
                    // png 的 spriteUrl 是模板替换后的
                    spriteUrl = applyGroupTemplate(spriteUrlTpl, group);
                    spriteOutPath = exportPng(cfg, group, result);
                }

                const lessOutPath = exportLess(cfg, group, lessText);
                return {
                    ok: true,
                    group,
                    kind,
                    spriteUrl,
                    exported: { spriteOutPath, lessOutPath },
                    result,
                };
            } catch (e: any) {
                // 导出失败：也作为 item 失败返回（不影响 batch 内部生成结果）
                return { ok: false, group, error: e?.message || String(e) } as SpriteGenerateItemResult;
            }


        })

        const success = items.filter((x: any) => x.ok).length;
        const failed = items.length - success;
        const projectName = project.name;
        if (failed === 0) {
            this.sysLog.success({
                refId: projectId,
                scope: "sprite",
                source: "system",
                text: `Sprite generation completed for project ${projectName}: ${success} success`
            })
        } else {
            this.sysLog.error({
                refId: projectId,
                scope: "sprite",
                source: "system",
                text: `Sprite generation completed for project ${projectName} with errors:  ${failed} failed`
            })
        }
        return {
            code: failed === 0 ? 1 : 0, // 0 失败，1 成功
            projectId,
            sourceId: String((cfg as any).sourceId ?? ""),
            iconsRoot,
            cacheOutDir,
            export: {
                enabled: true,
                spriteExportDir: String((cfg as any).spriteExportDir ?? ""),
                lessExportDir: String((cfg as any).lessExportDir ?? ""),
                persistLess,
            },
            total: items.length,
            success,
            failed,
            items,
            config: cfg,
        };
    }
}

/**
 * 决定 iconsRoot：
 * 1) spriteConfig.localDir（如果配置了）
 * 2) project.assets 中 id==sourceId 的 localDir
 * 3) fallback project.assets.iconsSvn.localDir
 */
function resolveIconsRoot(project: Project, cfg: SpriteConfig): string {
    // const cfgLocal = String(cfg.localDir ?? "").trim();
    // if (cfgLocal) return cfgLocal;

    const bySource = resolveAssetLocalDir(project, cfg.sourceId);
    if (bySource) return bySource;

    const iconsSvnLocal = String(project?.assets?.iconsSvn?.localDir ?? "").trim();
    if (iconsSvnLocal) return iconsSvnLocal;

    throw new AppError("SPRITE_ICONS_ROOT_NOT_FOUND", "Cannot resolve icons root for sprite generation");
}

/**
 * 按 projectId + spriteConfig.sourceId 找到对应 asset.localDir
 * - assets 结构：iconsSvn/cutImageSvn/... 每个都有 id/kind/localDir
 */
function resolveAssetLocalDir(project: Project, sourceId: string): string | null {
    const assets = project?.assets;
    if (!assets) return null;
    const arr = Object.values(assets).filter(Boolean) as ProjectAssetSourceSvn[];
    const hit = arr.find((a) => a?.id === sourceId && a?.kind === "svn");
    return hit?.localDir ? String(hit.localDir) : null;
}

function applyGroupTemplate(tpl: string, group: string) {
    return String(tpl || "").replace(/{group}/g, group);
}
function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function exportPng(cfg: SpriteConfig, group: string, pngResult: any) {
    const spriteExportDir = String(cfg.spriteExportDir ?? "").trim();
    if (!spriteExportDir) throw new Error("spriteExportDir is required");
    ensureDir(spriteExportDir);

    const spriteOutPath = path.join(spriteExportDir, `${group}.png`);
    fs.copyFileSync(pngResult.spritePath, spriteOutPath);
    return spriteOutPath;
}

function exportLess(cfg: SpriteConfig, group: string, lessText: string) {
    const persistLess = cfg.persistLess ?? true;
    if (!persistLess) return undefined;

    const lessExportDir = String(cfg.lessExportDir ?? "").trim();
    if (!lessExportDir) throw new Error("lessExportDir is required when persistLess=true");
    ensureDir(lessExportDir);

    const lessOutPath = path.join(lessExportDir, `${group}.less`);
    fs.writeFileSync(lessOutPath, lessText ?? "", "utf-8");
    return lessOutPath;
}