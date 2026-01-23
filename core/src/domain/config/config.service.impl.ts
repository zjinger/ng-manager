import * as path from "node:path";
import { AppError } from "../../common/errors";
import { FileLock } from "../../infra/storage/file-lock";
import { ProjectService } from "../project";
import { ConfigCatalog, ConfigCatalogDocV1, ConfigFileType, ConfigTreeNode } from "./catalog";
import { ConfigRegistry } from "./config.registry";
import { ConfigResolver } from "./config.resolver";
import { ConfigService } from "./config.service";
import { ConfigDocumentStore } from "./config.store";
import { ConfigCodec, ConfigFileReadResult, ResolvedDoc, ResolvedDomain } from "./config.types";
import { ConfigPatch, diffToText } from "./patch";
import { ConfigSchema, ConfigViewModel, ConfigViewModelQuery, assertPatchBeforeMatch, getProviderByFramework } from "./providers";
import { WorkspaceModel, validateWorkspace, writeWorkspace } from "./workspace";
import { angularDomain, qualityDomain } from "./domains";

export class ConfigServiceImpl implements ConfigService {

    private readonly fileLock = new FileLock();
    private readonly registry: ConfigRegistry = new ConfigRegistry()
    private readonly resolver: ConfigResolver = new ConfigResolver()
    private readonly store: ConfigDocumentStore = new ConfigDocumentStore()
    private catalogCache = new Map<string, { rootDir: string; catalog: ResolvedDomain[]; ts: number }>();
    private readonly CATALOG_TTL = 2000; // 2s，MVP 足够
    constructor(private projectService: ProjectService) {
        this.registry.registerMany([
            angularDomain,
            qualityDomain,
        ])
    }

    async getCatalogDoc(projectId: string): Promise<ConfigCatalogDocV1> {
        const project = await this.projectService.get(projectId);
        const catalog = new ConfigCatalog();
        const tree = catalog.getTree();
        // 从 tree 收集所有出现的 file.type（去重）
        const types = new Set<ConfigFileType>();
        const walk = (nodes: ConfigTreeNode[]) => {
            for (const n of nodes) {
                if (n.file?.type) types.add(n.file.type);
                if (n.children?.length) walk(n.children);
            }
        };
        walk(tree);
        // 按 type 拿 schema（MVP：tsconfig/eslint/prettier 可先不实现）
        const schemas: Record<string, ConfigSchema> = {};
        for (const t of types) {
            try {
                const provider = getProviderByFramework(project.framework, t);
                schemas[t] = provider.getSchema();
            } catch {
                // 未实现的 provider：先不给 schema，前端可以展示“仅支持 Raw/未实现”
                // 也可以抛错更严格
            }
        }
        return {
            projectId,
            framework: project.framework,
            tree,
            schemas,
            version: 1,
        };
    }

    async getTree(projectId: string): Promise<ConfigTreeNode[]> {
        const project = await this.projectService.get(projectId);
        // MVP：catalog 先静态；后续可根据文件存在与否裁剪
        const catalog = new ConfigCatalog(/* future: framework */);
        return catalog.getTree();
    }

    async getSchema(projectId: string, type?: ConfigFileType): Promise<ConfigSchema> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, type);
        return provider.getSchema();
    }

    async getWorkspace(projectId: string, opts?: { type?: ConfigFileType; relPath?: string; }): Promise<Pick<WorkspaceModel, "filePath" | "raw">> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);
        const ws = await provider.load(project.root, opts?.relPath);
        validateWorkspace(ws);
        return { filePath: ws.filePath, raw: ws.raw };
    }

    async getViewModel(projectId: string, opts?: { type?: ConfigFileType; } & ConfigViewModelQuery): Promise<ConfigViewModel> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);
        const ws = await provider.load(project.root);
        validateWorkspace(ws);

        return provider.toViewModel(ws, {
            project: opts?.project,
            target: opts?.target,
            configuration: opts?.configuration,
        });

    }
    async diff(projectId: string, patch: ConfigPatch, opts?: { type?: ConfigFileType; }): Promise<{ patch: ConfigPatch; diffText: string; nextRawPreview: any; }> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);
        const ws = await provider.load(project.root);
        validateWorkspace(ws);

        // diff 也做 before 校验：早发现冲突
        assertPatchBeforeMatch(ws.raw, patch);

        const next = provider.applyPatch(ws, patch);
        validateWorkspace(next);

        return {
            patch,
            diffText: diffToText(patch),
            nextRawPreview: next.raw,
        };

    }

    async apply(projectId: string, patch: ConfigPatch, opts?: { type?: ConfigFileType; force?: boolean; }): Promise<{ saved: true; forced: boolean; filePath: string; diffText: string; }> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);

        // 锁外仅为拿 filePath
        const ws = await provider.load(project.root);
        validateWorkspace(ws);

        const forced = opts?.force === true;

        return await this.fileLock.withLock(ws.filePath, async () => {
            const locked = await provider.load(project.root);
            validateWorkspace(locked);

            if (!forced) {
                assertPatchBeforeMatch(locked.raw, patch);
            }

            const next = provider.applyPatch(locked, patch);
            validateWorkspace(next);

            await writeWorkspace(next);

            return {
                saved: true as const,
                forced,
                filePath: next.filePath,
                diffText: diffToText(patch),
            };
        });
    }


    async getCatalog(projectId: string): Promise<ResolvedDomain[]> {
        const project = await this.projectService.get(projectId);
        return this.getCachedCatalog(projectId, project.root);
    }

    async readDoc(projectId: string, docId: string): Promise<ConfigFileReadResult> {
        const project = await this.projectService.get(projectId);
        const catalog = this.getCachedCatalog(projectId, project.root);
        const rd = this.findResolvedDoc(catalog, docId);
        if (!rd) throw new AppError("CONFIG_READ_FAILED", "unknown config docId", { docId, projectId });
        if (!rd.exists || !rd.absPath || !rd.chosen) {
            throw new AppError("CONFIG_READ_FAILED", "config doc not found on disk", { docId, projectId, rootDir: project.root });
        }
        const result = this.store.read(rd.absPath, rd.chosen.codec);
        return { ...result, relPath: rd.chosen.relPath };
    }

    async writeDoc(projectId: string, docId: string, next: unknown): Promise<void> {
        const project = await this.projectService.get(projectId);
        const catalog = this.getCachedCatalog(projectId, project.root);
        const rd = this.findResolvedDoc(catalog, docId);

        // 注意：doc 可能被裁剪掉（missing=hide），此时 rd 为空
        // 如果需要支持 showAsCreate，则不能依赖 catalog，得从 registry 找 spec
        if (rd?.exists && rd.absPath && rd.chosen) {
            await this.fileLock.withLock(rd.absPath, async () => {
                this.store.write(rd.absPath!, rd.chosen!.codec, next, { format: "pretty" });
            });
            // 写完刷新 cache，确保 UI 立即一致
            this.catalogCache.delete(projectId);
            return;
        }
        throw new AppError("CONFIG_WRITE_FAILED", "unknown config docId", { docId, projectId, rootDir: project.root });
    }

    /**
     * 解析配置目录
     * rootDir 项目根目录
     * @returns 解析后的配置域数组
     */
    private resolveCatalog(rootDir: string): ResolvedDomain[] {
        return this.resolver.resolveAll(rootDir, this.registry.list());
    }

    /**
     * 获取缓存的配置目录
     * @param projectId 项目 ID
     * @param rootDir 项目根目录
     * @returns 解析后的配置域数组
     */
    private getCachedCatalog(projectId: string, rootDir: string): ResolvedDomain[] {
        const hit = this.catalogCache.get(projectId);
        const now = Date.now();
        if (hit && hit.rootDir === rootDir && (now - hit.ts) < this.CATALOG_TTL) {
            return hit.catalog;
        }
        const catalog = this.resolveCatalog(rootDir);
        this.catalogCache.set(projectId, { rootDir, catalog, ts: now });
        return catalog;
    }

    /**
     * 从 catalog 中获取指定 doc
     * @param catalog 配置目录
     * @param docId 配置文件 ID
     * @returns 解析后的配置文件 | undefined
     */
    private findResolvedDoc(catalog: ResolvedDomain[], docId: string): ResolvedDoc | undefined {
        for (const d of catalog) {
            const rd = d.docs.find(x => x.spec.id === docId);
            if (rd) return rd;
        }
        return undefined;
    }
}