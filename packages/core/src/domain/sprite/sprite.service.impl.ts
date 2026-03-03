import { generateGroupBatch, GenerateSpriteResult, SpriteMetaFile, SvgMetaFile } from "@yinuo-ngm/sprite";
import fs from "node:fs";
import path from "node:path";
import { AppError } from "../../common/errors";
import { SystemLogService } from "../logger";
import { Project, ProjectAssetSourceSvn, ProjectService } from "../project";
import { SpriteRepo } from "./sprite.repo";
import { SpriteService } from "./sprite.service";
import { GenerateSpriteOptions, SpriteConfig, SpriteGroupItem, SpriteSnapshot } from "./sprite.types";
export class SpriteServiceImpl implements SpriteService {
    constructor(
        private spriteRepo: SpriteRepo,
        private project: ProjectService,
        private sysLog: SystemLogService,
        private cacheDir: string,
        private dataDir: string,
    ) {
    }

    ensureCacheDir(projectId: string) {
        const dir = path.join(this.cacheDir, "sprites", projectId);
        ensureDir(dir);
        return dir;
    }

    async getConfig(projectId: string): Promise<SpriteConfig | null> {
        const p = await this.project.get(projectId);
        const cfg = await this.spriteRepo.getByProjectId(projectId);
        if (cfg) {
            if ((!cfg.spriteExportDir || !cfg.lessExportDir || !cfg.localDir)) {
                const { localDir, spriteExportDir, lessExportDir } = computeSpriteDefaults(this.dataDir, p.id, p.root);
                cfg.spriteExportDir = cfg.spriteExportDir || spriteExportDir;
                cfg.lessExportDir = cfg.lessExportDir || lessExportDir;
                cfg.localDir = cfg.localDir || localDir;
            }
            return cfg;
        }
        const defaults = computeSpriteDefaults(this.dataDir, p.id, p.root);
        return {
            projectId,
            localDir: defaults.localDir,
            spriteExportDir: defaults.spriteExportDir,
            lessExportDir: defaults.lessExportDir,
        } as SpriteConfig;
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


    async generate(projectId: string, options?: GenerateSpriteOptions): Promise<SpriteSnapshot> {
        const cfg = await this.spriteRepo.getByProjectId(projectId);
        if (!cfg) throw new AppError("SPRITE_CONFIG_NOT_FOUND", `Sprite config not found for project ${projectId}`);

        const project = await this.project.get(projectId);
        if (!project) throw new AppError("PROJECT_NOT_FOUND", `Project not found: ${projectId}`);

        const iconsRoot = resolveIconsRoot(project, cfg);
        if (!fs.existsSync(iconsRoot)) throw new AppError("SPRITE_ICONS_ROOT_NOT_FOUND", `iconsRoot not found: ${iconsRoot}`);

        const cacheOutDir = this.ensureCacheDir(projectId);

        const concurrency = options?.concurrency ?? 1;
        const continueOnError = options?.continueOnError ?? true;
        const forceRefresh = !!options?.forceRefresh;

        const prefix = String(cfg.prefix ?? "sl").trim() || "sl";
        const algorithm = cfg.algorithm || "binary-tree";
        const persistLess = cfg.persistLess ?? true;
        const spriteUrlTpl = String(cfg.spriteUrl ?? "").trim();
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
                persistLess,
            },
            concurrency,
            continueOnError,
            svgUrlResolver: ({ group, file }) =>
                `/assets/icons/${encodeURIComponent(group)}/${encodeURIComponent(file)}`,
        });

        const outGroups: SpriteGroupItem[] = batch.items.map((it) => {
            if (!it.ok) {
                return { group: it.group, status: "error", error: it.error };
            }
            const group = it.group;
            const kind: "png" | "svg" = it.type === "png" ? "png" : "svg";
            const result = it.result;

            let meta: SpriteMetaFile | undefined;
            let spriteUrl: string | undefined;
            let previewSpriteUrl: string | undefined;
            let lessText = "";
            const r = result;
            if (r?.metaPath && fs.existsSync(r.metaPath)) {
                meta = safeReadJson(r.metaPath) as SpriteMetaFile;
            }
            if (kind === 'png') {
                spriteUrl = (r as GenerateSpriteResult)?.spriteUrl;
                previewSpriteUrl = `/sprites/${encodeURIComponent(projectId)}/${encodeURIComponent(group)}.png`;
                lessText = String(result?.lessText ?? "");
            }

            // 导出：失败只影响该 group 状态，不影响其他 group
            try {
                let spriteOutPath: string | undefined;
                let lessOutPath: string | undefined;
                if (kind === "png") {
                    spriteOutPath = exportPng(cfg, group, result);
                    lessOutPath = exportLess(cfg, group, lessText);
                }
                return {
                    group,
                    kind,
                    spriteUrl,
                    previewSpriteUrl,
                    meta,
                    lessText,
                    exported: { spriteOutPath, lessOutPath },
                    status: "ok",
                };
            } catch (e: any) {
                return {
                    group,
                    kind,
                    previewSpriteUrl,
                    spriteUrl,
                    meta,
                    lessText,
                    status: "error",
                    error: e?.message || String(e),
                };
            }
        });

        const success = outGroups.filter((g) => g.status !== "error").length;
        const failed = outGroups.length - success;

        this.sysLog.info({
            refId: projectId,
            scope: "sprite",
            source: "system",
            text: `Sprite generation completed: ${success} success, ${failed} failed`,
        })
        outGroups.sort((a, b) => {
            const na = Number(String(a.group).split("-")[0]);
            const nb = Number(String(b.group).split("-")[0]);
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
            return a.group.localeCompare(b.group, "zh-Hans-CN", { numeric: true });
        });
        return {
            projectId,
            sourceId: String(cfg.sourceId ?? ""),
            iconsRoot,
            cacheOutDir,
            config: cfg,
            total: outGroups.length,
            success,
            failed,
            groups: outGroups,
        };
    }

    async getSprites(projectId: string): Promise<SpriteSnapshot> {
        const cfg = await this.getConfig(projectId);
        if (!cfg) throw new AppError("SPRITE_CONFIG_NOT_FOUND", `Sprite config not found for project ${projectId}`);

        const cacheOutDir = this.ensureCacheDir(projectId);

        if (!fs.existsSync(cacheOutDir)) {
            return {
                projectId,
                sourceId: String(cfg.sourceId ?? ""),
                cacheOutDir,
                config: cfg,
                total: 0,
                success: 0,
                failed: 0,
                groups: [],
            };
        }
        const spriteUrlTpl = String(cfg.spriteUrl ?? "").trim();
        const metaSuffix = ".meta.json";

        const files = fs.readdirSync(cacheOutDir).filter((f) => f.endsWith(metaSuffix));

        const groups = files
            .map((f) => f.slice(0, -metaSuffix.length))
            .map((group) => {
                const metaPath = path.join(cacheOutDir, `${group}${metaSuffix}`);
                const meta = safeReadJson(metaPath) as SpriteMetaFile | SvgMetaFile;
                let lessText = "", spriteUrl, previewSpriteUrl;
                if (meta.mode === 'png') {
                    spriteUrl = spriteUrlTpl ? applyGroupTpl(spriteUrlTpl, group) : undefined;
                    previewSpriteUrl = `/sprites/${encodeURIComponent(projectId)}/${encodeURIComponent(group)}.png`;
                    const lessPath = path.join(cacheOutDir, `${group}.less`);
                    if (fs.existsSync(lessPath)) {
                        try { lessText = fs.readFileSync(lessPath, "utf-8"); } catch {
                            /* ignore */
                            console.warn(`Failed to read less file for group ${group}: ${lessPath}`);
                        }
                    }
                } else if (meta.mode === 'svg') {
                    // svg 的 previewUrl 直接指向原 svg 文件（不经过 spriteUrl 模板）
                    // const m = meta as SvgMetaFile;
                    // m.icons.forEach((icon) => { 
                    //     icon.previewUrl = `/assets/icons/${encodeURIComponent(group)}/${encodeURIComponent(icon.file)}`;
                    // })
                }
                return {
                    group,
                    kind: meta.mode,
                    spriteUrl,
                    previewSpriteUrl,
                    meta,
                    lessText,
                    status: "ok" as const,
                };
            });

        groups.sort((a, b) => {
            const na = Number(String(a.group).split("-")[0]);
            const nb = Number(String(b.group).split("-")[0]);
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
            return a.group.localeCompare(b.group, "zh-Hans-CN", { numeric: true });
        });

        return {
            projectId,
            sourceId: String(cfg.sourceId ?? ""),
            cacheOutDir,
            config: cfg,
            total: groups.length,
            success: groups.length,
            failed: 0,
            groups,
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

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function computeSpriteDefaults(dataDir: string, projectId: string, projectRoot: string) {
    const localDir = path.join(dataDir, "svn", projectId);
    ensureDir(localDir);
    return {
        localDir,
        spriteExportDir: path.join(projectRoot, "src", "assets", "icons"),
        lessExportDir: path.join(projectRoot, "src", "styles", "icons"),
    };
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

function safeReadJson(file: string) {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
}

function applyGroupTpl(tpl: string, group: string) {
    // return String(tpl || "").replaceAll("{group}", group);
    return String(tpl || "").replace(/{group}/g, group);
}