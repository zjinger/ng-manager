import { generateGroupBatch } from "../batch";
import { GenerateSpriteResult, SpriteMetaFile, SvgMetaFile } from "../types";
import type { GenerateGroupBatchItem } from "../types";
import fs from "node:fs";
import path from "node:path";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { SystemLogService } from "@yinuo-ngm/logger";
import { Project, ProjectAssetSourceSvn, type ProjectService } from "@yinuo-ngm/project";
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

    ensureLocalCacheDir(projectId: string) {
        const dir = path.join(this.cacheDir, "sprites", projectId, "local");
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
        if (!cfg) throw new CoreError(CoreErrorCodes.SPRITE_CONFIG_NOT_FOUND, `Sprite config not found for project ${projectId}`);

        const project = await this.project.get(projectId);
        if (!project) throw new CoreError(CoreErrorCodes.PROJECT_NOT_FOUND, `Project not found: ${projectId}`);

        const iconsRoot = resolveIconsRoot(project, cfg);
        if (!fs.existsSync(iconsRoot)) throw new CoreError(CoreErrorCodes.SPRITE_ICONS_ROOT_NOT_FOUND, `iconsRoot not found: ${iconsRoot}`);

        const isLocalFolderMode = !!String(cfg.localImageRoot ?? "").trim();
        const cacheOutDir = isLocalFolderMode
            ? this.ensureLocalCacheDir(projectId)
            : this.ensureCacheDir(projectId);
        if (isLocalFolderMode) {
            resetLocalCacheIfSourceChanged(cacheOutDir, iconsRoot);
        }

        const concurrency = options?.concurrency ?? 1;
        const continueOnError = options?.continueOnError ?? true;
        const forceRefresh = !!options?.forceRefresh;

        const prefix = String(cfg.prefix ?? "sl").trim() || "sl";
        const algorithm = cfg.algorithm || "binary-tree";
        const persistLess = cfg.persistLess ?? true;
        const spriteUrlTpl = String(cfg.spriteUrl ?? "").trim();

        let groups: string[] | undefined;
        if (isLocalFolderMode) {
            groups = scanLocalFolderTwoLevels(iconsRoot);
        }

        const batch = await generateGroupBatch({
            iconsRoot,
            outDir: cacheOutDir,
            spriteUrlTemplate: spriteUrlTpl,
            groups: groups,
            prefix,
            algorithm,
            cache: {
                enabled: true,
                forceRefresh,
                persistLess,
            },
            concurrency,
            continueOnError,
            svgUrlResolver: ({ group, file }: { group: string; file: string }) =>
                `/assets/icons/${encodeURIComponent(group)}/${encodeURIComponent(file)}`,
        });
        if (isLocalFolderMode) {
            pruneLocalCacheByGroups(cacheOutDir, new Set(batch.items.map((it: GenerateGroupBatchItem) => it.group)));
        }

        const outGroups: SpriteGroupItem[] = batch.items.map((it: GenerateGroupBatchItem) => {
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
                previewSpriteUrl = buildPreviewSpriteUrl(projectId, group, isLocalFolderMode);
                lessText = String(result?.lessText ?? "");
            }

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

    async getSprites(projectId: string, local = false): Promise<SpriteSnapshot> {
        const cfg = await this.getConfig(projectId);
        if (!cfg) throw new CoreError(CoreErrorCodes.SPRITE_CONFIG_NOT_FOUND, `Sprite config not found for project ${projectId}`);

        const isLocalFolderMode = !!String(cfg.localImageRoot ?? "").trim();
        const cacheOutDir = local && isLocalFolderMode
            ? this.ensureLocalCacheDir(projectId)
            : this.ensureCacheDir(projectId);

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
                    previewSpriteUrl = buildPreviewSpriteUrl(projectId, group, local && isLocalFolderMode);
                    const lessPath = path.join(cacheOutDir, `${group}.less`);
                    if (fs.existsSync(lessPath)) {
                        try { lessText = fs.readFileSync(lessPath, "utf-8"); } catch {
                            console.warn(`Failed to read less file for group ${group}: ${lessPath}`);
                        }
                    }
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

function resolveIconsRoot(project: Project, cfg: SpriteConfig): string {
    const localImageRoot = String(cfg.localImageRoot ?? "").trim();
    if (localImageRoot) return localImageRoot;

    const bySource = resolveAssetLocalDir(project, cfg.sourceId);
    if (bySource) return bySource;

    const iconsSvnLocal = String(project?.assets?.iconsSvn?.localDir ?? "").trim();
    if (iconsSvnLocal) return iconsSvnLocal;

    throw new CoreError(CoreErrorCodes.SPRITE_ICONS_ROOT_NOT_FOUND, "Cannot resolve icons root for sprite generation");
}

function scanLocalFolderTwoLevels(localImageRoot: string): string[] {
    if (!fs.existsSync(localImageRoot)) return [];

    const groups: string[] = [];
    const entries = fs.readdirSync(localImageRoot, { withFileTypes: true });

    const rootHasImages = entries.some((e) => e.isFile() && isImageFile(e.name));
    if (rootHasImages) {
        groups.push(".");
    }

    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (entry.name.startsWith('.')) continue;
            const subDir = path.join(localImageRoot, entry.name);
            const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
            const subHasImages = subEntries.some((e) => e.isFile() && isImageFile(e.name));
            if (subHasImages) {
                groups.push(entry.name);
            }
        }
    }

    return groups;
}

function isImageFile(name: string): boolean {
    const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
    return ext === '.png' || ext === '.svg';
}

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
    if (!spriteExportDir) throw new CoreError(CoreErrorCodes.INVALID_NAME, "spriteExportDir is required");
    ensureDir(spriteExportDir);

    const spriteOutPath = path.join(spriteExportDir, `${group}.png`);
    fs.copyFileSync(pngResult.spritePath, spriteOutPath);
    return spriteOutPath;
}

function exportLess(cfg: SpriteConfig, group: string, lessText: string) {
    const persistLess = cfg.persistLess ?? true;
    if (!persistLess) return undefined;

    const lessExportDir = String(cfg.lessExportDir ?? "").trim();
    if (!lessExportDir) throw new CoreError(CoreErrorCodes.INVALID_NAME, "lessExportDir is required when persistLess=true");
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
    return String(tpl || "").replace(/{group}/g, group);
}

function buildPreviewSpriteUrl(projectId: string, group: string, local: boolean): string {
    const base = `/sprites/${encodeURIComponent(projectId)}`;
    const file = `${encodeURIComponent(group)}.png`;
    return local ? `${base}/local/${file}` : `${base}/${file}`;
}

function resetLocalCacheIfSourceChanged(cacheOutDir: string, iconsRoot: string): void {
    const markerFile = path.join(cacheOutDir, ".source-root.txt");
    const nextRoot = path.resolve(iconsRoot);
    const prevRoot = fs.existsSync(markerFile)
        ? String(fs.readFileSync(markerFile, "utf-8") || "").trim()
        : "";

    if (prevRoot && prevRoot === nextRoot) {
        return;
    }

    const files = fs.readdirSync(cacheOutDir);
    for (const file of files) {
        if (file === ".source-root.txt") continue;
        const full = path.join(cacheOutDir, file);
        fs.rmSync(full, { recursive: true, force: true });
    }

    fs.writeFileSync(markerFile, nextRoot, "utf-8");
}

function pruneLocalCacheByGroups(cacheOutDir: string, keepGroups: Set<string>): void {
    const files = fs.readdirSync(cacheOutDir);
    for (const file of files) {
        if (file === ".source-root.txt") continue;
        if (file.endsWith(".meta.json")) {
            const group = file.slice(0, -".meta.json".length);
            if (!keepGroups.has(group)) {
                removeGroupArtifacts(cacheOutDir, group);
            }
        }
    }
}

function removeGroupArtifacts(cacheOutDir: string, group: string): void {
    const paths = [
        path.join(cacheOutDir, `${group}.meta.json`),
        path.join(cacheOutDir, `${group}.less`),
        path.join(cacheOutDir, `${group}.png`),
        path.join(cacheOutDir, group),
    ];
    for (const p of paths) {
        fs.rmSync(p, { recursive: true, force: true });
    }
}
