import { promises as fsp } from "node:fs";
import * as path from "node:path";
import { AppError } from "../../common/errors";
import { genId } from "../../common/id";
import type { ProjectRepo } from "./project.repo";
import type { ImportCheckResult, CreateProjectInput, DetectResult, Project, CheckRootResult } from "./project.types";
import { scanProject } from "./project.scanner";
import { ProjectMeta } from "./project.meta";
import { ProjectService } from "./project.service";
import { EditorService } from "../editor";

export class ProjectServiceImpl implements ProjectService {
    constructor(
        private repo: ProjectRepo,
        private editor: EditorService

    ) { }

    async importProject(input: { root: string; name?: string; }): Promise<Project> {
        const { root, name } = input;
        const check = await this.checkImport(root);

        if (!check.ok || !check.meta) {
            throw new AppError(
                check.code ?? "PROJECT_ROOT_INVALID",
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
        // hard-1: 必须存在且是目录
        if (!base.exists) return { ok: false, root: base.root, reason: "path does not exist" };
        if (!base.isDir) return { ok: false, root: base.root, reason: "path must be a directory" };
        // hard-2: 不能重复注册
        if (base.alreadyRegistered) return { ok: false, root: base.root, reason: "already registered" };
        // soft detect（scan 可能失败，但我们可以把失败当 hard fail 或 soft warning）
        let meta: ProjectMeta;
        try {
            meta = await this.scan(base.root);
        } catch (e: any) {
            // 不是所有文件夹都能导入，scan 失败直接 hard fail
            return { ok: false, root: base.root, reason: `scan failed: ${e?.message || "unknown"}` };
        }

        const scripts = meta.scripts ?? {};
        const scriptKeys = Object.keys(scripts);

        const detect: DetectResult = {
            framework: meta.framework,
            hasPackageJson: meta.hasPackageJson ?? false,   // 下面 scanner 会补
            scripts: scriptKeys,
            scriptsCount: scriptKeys.length,
            recommendedScript: scripts.dev ? "dev" : scripts.start ? "start" : scriptKeys[0],
            lockFile: meta.packageManager,
            hasGit: meta.hasGit ?? false,
            hasMakefile: meta.hasMakefile ?? false,
            hasDockerCompose: meta.hasDockerCompose ?? false,
        };

        // hard-3:核心判定：看起来像个项目？
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
        // soft warnings：不阻止导入，但提示
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
        if (!p) throw new AppError("PROJECT_NOT_FOUND", `Project not found: ${id}`, { projectId: id });
        return p;
    }

    async create(input: CreateProjectInput): Promise<Project> {
        // root 去重（避免重复导入同一路径）
        const existed = await this.repo.findByRoot(input.root);
        if (existed) {
            throw new AppError("PROJECT_ALREADY_EXISTS", `Project already exists: ${input.root}`, { projectId: existed.id });
        }

        //  自动扫描 package.json scripts（除非用户传了 scripts）
        let scripts = input.scripts;
        if (!scripts) {
            const meta = await scanProject(input.root);
            scripts = meta.scripts;
        }

        const now = Date.now();
        const p: Project = {
            id: genId("proj"),
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
        // 先确保存在
        await this.get(id);
        const now = Date.now();
        const updated = await this.repo.update(id, {
            ...patch,
            updatedAt: now,
        });

        return updated;
    }

    async remove(id: string): Promise<void> {
        // 先确保存在
        await this.get(id);
        await this.repo.remove(id);
    }

    //  可选增强：提供一个 refreshScripts（后面 UI 点“刷新”时用）
    async refreshScripts(id: string): Promise<Project> {
        const p = await this.get(id);
        const meta = await scanProject(p.root);
        return this.update(id, { scripts: meta.scripts } as any);
    }

    /**
     * 扫描指定路径，得到 ProjectMeta
     */
    async scan(root: string): Promise<ProjectMeta> {
        return scanProject(root);
    }

    async setFavorite(id: string, isFavorite: boolean): Promise<Project> {
        // 确保存在
        await this.get(id);
        return this.update(id, {
            isFavorite: !!isFavorite,
        } as any);
    }

    async setLastOpened(id: string, timestamp: number): Promise<Project> {
        // 确保存在
        await this.get(id);
        return this.update(id, {
            lastOpened: timestamp,
        } as any);
    }

    async rename(id: string, name: string): Promise<Project> {
        // 确保存在
        await this.get(id);
        return this.update(id, {
            name: name.trim(),
        } as any);
    }

    async toggleFavorite(id: string): Promise<Project> {
        const p = await this.get(id);
        const next = !p.isFavorite;
        return this.setFavorite(id, next);
    }

    async openInEditor(id: string, opts?: { editor?: "code" | "system" }): Promise<void> {
        const p = await this.get(id); // 不存在会抛 PROJECT_NOT_FOUND
        try {
            await this.editor.openFolder(p.root, { editor: opts?.editor ?? "code" });
        } catch (e: any) {
            if (e instanceof AppError) throw e;
            throw new AppError("UNKNOWN_ERROR", e?.message || "open editor failed", { projectId: id, root: p.root });
        }
    }
}
