import { promises as fsp } from "node:fs";
import * as path from "node:path";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { uid } from "@yinuo-ngm/shared";
import type { ProjectRepo } from "./project.repo";
import type { ImportCheckResult, CreateProjectInput, DetectResult, Project, CheckRootResult, ProjectAssets, ProjectAssetSourceSvn } from "./project.types";
import { scanProject } from "./project.scanner";
import { ProjectMeta } from "./project.meta";
import { ProjectService } from "./project.service";

export class ProjectServiceImpl implements ProjectService {

    constructor(private repo: ProjectRepo,) { }

    async importProject(input: { root: string; name?: string; }): Promise<Project> {
        const { root, name } = input;
        const check = await this.checkImport(root);

        if (!check.ok || !check.meta) {
            throw new CoreError(
                CoreErrorCodes.PROJECT_ROOT_INVALID,
                check.reason ?? "Import project failed",
                { root, detect: check.detect, meta: check.meta }
            );
        }
        const projectName =
            name?.trim() ||
            path.basename(root.replace(/[\\/]+$/, "")) ||
            "Imported Project";

        return this.create({
            name: projectName,
            root,
            scripts: check.meta.scripts,
        });
    }

    async checkImport(rootPath: string): Promise<ImportCheckResult> {
        const base = await this.checkRoot(rootPath);
        if (!base.ok) return { ok: false, root: base.root, reason: base.message || "invalid root" };
        if (!base.exists) return { ok: false, root: base.root, reason: "path does not exist" };
        if (!base.isDir) return { ok: false, root: base.root, reason: "path must be a directory" };
        if (base.alreadyRegistered) return { ok: false, root: base.root, reason: "already registered" };
        let meta: ProjectMeta;
        try {
            meta = await this.scan(base.root);
        } catch (e: any) {
            return { ok: false, root: base.root, reason: `scan failed: ${e?.message || "unknown"}` };
        }

        const scripts = meta.scripts ?? {};
        const scriptKeys = Object.keys(scripts);

        const detect: DetectResult = {
            framework: meta.framework,
            hasPackageJson: meta.hasPackageJson ?? false,
            scripts: scriptKeys,
            scriptsCount: scriptKeys.length,
            recommendedScript: scripts.dev ? "dev" : scripts.start ? "start" : scriptKeys[0],
            lockFile: meta.packageManager,
            hasGit: meta.hasGit ?? false,
            hasMakefile: meta.hasMakefile ?? false,
            hasDockerCompose: meta.hasDockerCompose ?? false,
        };

        const looksLikeProject =
            !!detect.hasPackageJson ||
            !!detect.hasGit ||
            (detect.framework && detect.framework !== "unknown") ||
            !!detect.hasMakefile ||
            !!detect.hasDockerCompose ||
            (detect.scriptsCount ?? 0) > 0;

        if (!looksLikeProject) {
            return { ok: false, root: base.root, reason: "not a recognized project folder", detect };
        }
        const warnings: string[] = [];
        if (!detect.hasGit) warnings.push("No .git found");
        if ((detect.scriptsCount ?? 0) === 0) warnings.push("No scripts found in package.json");
        return { ok: true, root: base.root, detect, warnings, meta };
    }

    async checkRoot(rootPath: string): Promise<CheckRootResult> {
        const root = path.resolve(rootPath || "").replace(/[\\/]+$/, "");
        if (!root) {
            return { ok: false, root: "", exists: false, isDir: false, alreadyRegistered: false, message: "rootPath is empty" };
        }

        let st: any = null;
        try { st = await fsp.stat(root); } catch { }

        const exists = !!st;
        const isDir = !!st && st.isDirectory();

        const existed = await this.repo.findByRoot(root);
        const alreadyRegistered = !!existed;

        return {
            ok: true,
            root,
            exists,
            isDir,
            alreadyRegistered,
        };
    }

    async list(): Promise<Project[]> {
        return this.repo.list();
    }

    async get(id: string): Promise<Project> {
        const p = await this.repo.get(id);
        if (!p) throw new CoreError(CoreErrorCodes.PROJECT_NOT_FOUND, `Project not found: ${id}`, { projectId: id });
        return p;
    }

    async create(input: CreateProjectInput): Promise<Project> {
        const existed = await this.repo.findByRoot(input.root);
        if (existed) {
            throw new CoreError(CoreErrorCodes.PROJECT_ALREADY_EXISTS, `Project already exists: ${input.root}`, { projectId: existed.id });
        }

        let scripts = input.scripts;
        if (!scripts) {
            const meta = await scanProject(input.root);
            scripts = meta.scripts;
        }

        const now = Date.now();
        const p: Project = {
            id: uid("proj"),
            name: input.name,
            root: input.root,
            scripts,
            env: input.env,
            createdAt: now,
            updatedAt: now,
        };

        await this.repo.create(p);
        return p;
    }

    async update(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>): Promise<Project> {
        await this.get(id);
        const now = Date.now();
        const updated = await this.repo.update(id, {
            ...patch,
            updatedAt: now,
        });
        return updated;
    }

    async remove(id: string): Promise<void> {
        await this.get(id);
        await this.repo.remove(id);
    }

    async refreshScripts(id: string): Promise<Project> {
        const p = await this.get(id);
        const meta = await scanProject(p.root);
        return this.update(id, { scripts: meta.scripts } as any);
    }

    async scan(root: string): Promise<ProjectMeta> {
        return scanProject(root);
    }

    async setFavorite(id: string, isFavorite: boolean): Promise<Project> {
        return this.update(id, {
            isFavorite: !!isFavorite,
        } as any);
    }

    async setLastOpened(id: string, timestamp: number): Promise<Project> {
        return this.update(id, {
            lastOpened: timestamp,
        } as any);
    }

    async rename(id: string, name: string): Promise<Project> {
        return this.update(id, {
            name: name.trim(),
        } as any);
    }

    async toggleFavorite(id: string): Promise<Project> {
        const p = await this.get(id);
        const next = !p.isFavorite;
        return this.setFavorite(id, next);
    }

    async edit(id: string, data: { name: string; description?: string; repoPageUrl?: string; }): Promise<Project> {
        return this.update(id, {
            name: data.name.trim(),
            description: data.description?.trim(),
            repoPageUrl: data.repoPageUrl?.trim(),
        } as any);
    }

    async updateAssets(id: string, assets: ProjectAssets): Promise<Project> {
        const { iconsSvn, cutImageSvn } = assets;
        const normalizedIconsSources = iconsSvn ? this.normalizeAssetsSource(iconsSvn) : undefined;
        const normalizedCutImageSources = cutImageSvn ? this.normalizeAssetsSource(cutImageSvn) : undefined;

        return await this.update(id, {
            assets: { iconsSvn: normalizedIconsSources, cutImageSvn: normalizedCutImageSources }
        });
    }

    async getAssets(id: string): Promise<ProjectAssets | null> {
        const p = await this.get(id);
        return p.assets || null;
    }

    private normalizeAssetsSource(source: ProjectAssetSourceSvn): ProjectAssetSourceSvn {
        const url = String(source.url || "").trim();
        const kind = String(source.kind || "svn").trim();
        const mode = (String(source.mode || "manual").trim() as any) || "manual";
        if (!["manual", "export", "checkout"].includes(mode)) {
            throw new CoreError(CoreErrorCodes.ASSET_MODE_INVALID, `source.mode invalid: ${mode}`);
        }
        if (kind !== "svn") {
            throw new CoreError(CoreErrorCodes.ASSET_KIND_NOT_SUPPORTED, `source.kind not supported: ${kind}`);
        }
        if (!url) {
            throw new CoreError(CoreErrorCodes.ASSET_URL_REQUIRED, "source.url is required");
        }
        if (!url.startsWith("svn://")) {
            throw new CoreError(CoreErrorCodes.ASSET_URL_INVALID, `source.url must start with svn://: ${url}`);
        }
        const label = String(source.label).trim();
        if (!label) {
            throw new CoreError(CoreErrorCodes.ASSET_LABEL_REQUIRED, "source.label is required");
        }

        const sourceId = String(source.id || "").trim() || uid("svn");

        const localDir = source.localDir ? String(source.localDir).trim() : undefined;

        return {
            id: sourceId,
            kind: "svn" as const,
            label,
            url,
            localDir,
            mode,
        };
    }
}
