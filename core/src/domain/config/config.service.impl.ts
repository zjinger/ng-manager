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
import { AngularSchemaProvider, DomainSchemaDoc, DomainSchemaProvider, DomainSchemaRegistry, ConfigSchema as ConfigSchemaV2 } from "./schema";
import { deepMerge } from "./schema/merge";
import { DomainSchemaContext, DomainSchemaDiffResult } from "./schema/schema.types";

export class ConfigServiceImpl implements ConfigService {

    private readonly fileLock = new FileLock();
    private readonly registry: ConfigRegistry = new ConfigRegistry()
    private readonly resolver: ConfigResolver = new ConfigResolver()
    private readonly store: ConfigDocumentStore = new ConfigDocumentStore()
    private readonly schemaRegistry = new DomainSchemaRegistry();

    private catalogCache = new Map<string, { rootDir: string; catalog: ResolvedDomain[]; ts: number }>();

    private readonly CATALOG_TTL = 2000; // 2s，MVP 足够
    constructor(private projectService: ProjectService) {
        this.registry.registerMany([
            angularDomain,
            qualityDomain,
        ])
        this.schemaRegistry.register(new AngularSchemaProvider());
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

    async openDoc(projectId: string, docId: string): Promise<{ root: string; filePath: string }> {
        const project = await this.projectService.get(projectId);
        const catalog = this.getCachedCatalog(projectId, project.root);
        const rd = this.findResolvedDoc(catalog, docId);
        console.log('rd', rd)
        if (!rd) throw new AppError("CONFIG_OPEN_FAILED", "unknown config docId", { docId, projectId });
        if (!rd.exists || !rd.absPath || !rd.chosen) {
            throw new AppError("CONFIG_OPEN_FAILED", "config doc not found on disk", { docId, projectId, rootDir: project.root });
        }
        return { root: project.root, filePath: rd.absPath! };
    }

    async getDomainSchemaDoc(projectId: string, domainId: string): Promise<DomainSchemaDoc> {
        const project = await this.projectService.get(projectId);

        const provider = this.getProvider(domainId);
        const docs = await this.getBaselineDocs(projectId, domainId);
        const ctx = this.buildSchemaCtx(projectId, project.root);

        const schema: ConfigSchemaV2 = provider.getSchema();
        const vm = provider.assemble(docs, ctx);
        console.log("ConfigServiceImpl.getDomainSchemaDoc: vm =", vm);
        const options = provider.getOptions?.(docs, ctx, vm) ?? {};

        return {
            domainId,
            schema,
            vm,
            options,
            meta: {
                // 可选：把 domain docs 的 relPath/codec/exist 也塞进去，UI 可展示“来源文件”
            },
        };
    }

    async readDomainSchema(projectId: string, domainId: string) {
        const project = await this.projectService.get(projectId);
        const provider = this.getProvider(domainId);
        const docsData = await this.getBaselineDocs(projectId, domainId);
        const ctx = this.buildSchemaCtx(projectId, project.root);
        console.log('docsData', docsData);
        return provider.assemble(docsData, ctx);
    }

    async writeDomainSchema(
        projectId: string,
        domainId: string,
        nextVM: any
    ) {
        const project = await this.projectService.get(projectId);
        const provider = this.getProvider(domainId);
        const ctx = this.buildSchemaCtx(projectId, project.root);

        const baselineDocs = await this.getBaselineDocs(projectId, domainId);
        const baselineVM = provider.assemble(baselineDocs, ctx);

        provider.validate?.(nextVM, ctx);

        const diffRes: DomainSchemaDiffResult = provider.diff(baselineVM, nextVM, ctx);
        const docPatch = diffRes.docPatch ?? {};
        const filePatch = diffRes.filePatch ?? [];

        // 1) 写回 domain docs（docId）
        for (const [docId, patch] of Object.entries(docPatch)) {
            const base = baselineDocs[docId];
            if (base == null) {
                // patch 指向不存在的 doc：明确抛错，避免 silent fail
                throw new AppError("CONFIG_WRITE_FAILED", "docPatch refers to unknown baseline doc", {
                    projectId,
                    domainId,
                    docId,
                });
            }
            const nextDoc = deepMerge(base, patch);
            await this.writeDoc(projectId, docId, nextDoc);
        }

        // 2) 写回引用文件（relPath）
        for (const fp of filePatch) {
            if (!fp?.relPath) {
                throw new AppError("CONFIG_WRITE_FAILED", "filePatch.relPath is required", {
                    projectId,
                    domainId,
                    fp,
                });
            }
            const base = ctx.readFile(fp.relPath, fp.codec).data;
            const nextFile = deepMerge(base, fp.patch);
            await ctx.writeFile(fp.relPath, fp.codec, nextFile);
        }

        // 写完刷新缓存
        this.catalogCache.delete(projectId);
    }




    private getProvider(domainId: string): DomainSchemaProvider {
        const provider = this.schemaRegistry.get(domainId);
        if (!provider) {
            throw new AppError("CONFIG_SCHEMA_NOT_FOUND", "schema provider not found", { domainId });
        }
        return provider;
    }

    private async getDomain(projectId: string, domainId: string): Promise<ResolvedDomain> {
        const catalog = await this.getCatalog(projectId);
        const domain = catalog.find(d => d.domain.id === domainId);
        if (!domain) throw new AppError("CONFIG_DOMAIN_NOT_FOUND", domainId);
        return domain;
    }

    private async getBaselineDocs(projectId: string, domainId: string): Promise<Record<string, any>> {
        const domain = await this.getDomain(projectId, domainId);
        const docsData: Record<string, any> = {};
        for (const d of domain.docs) {
            if (!d.exists) continue;
            const r = await this.readDoc(projectId, d.spec.id);
            docsData[d.spec.id] = r.data;
        }
        return docsData;
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


    /**
     * 构建 DomainSchemaContext
     * @param projectId 项目 ID
     * @param rootDir 项目根目录
     * @returns DomainSchemaContext
     */
    private buildSchemaCtx(projectId: string, rootDir: string) {
        return {
            projectId,
            rootDir,
            readFile: (relPath: string, codec: ConfigCodec) => {
                const absPath = path.resolve(rootDir, relPath);
                const r = this.store.read(absPath, codec);
                return { data: r.data, raw: r.raw, absPath };
            },
            writeFile: async (relPath: string, codec: ConfigCodec, next: any) => {
                const absPath = path.resolve(rootDir, relPath);
                await this.fileLock.withLock(absPath, async () => {
                    this.store.write(absPath, codec, next, { format: "pretty" });
                });
            },
        } satisfies DomainSchemaContext;
    }


}