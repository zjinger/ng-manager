// core/src/domain/config/config.service.impl.ts
import * as path from "node:path";
import { AppError } from "../../common/errors";
import { FileLock } from "../../infra/storage/file-lock";
import { ProjectService } from "../project";
import { ConfigRegistry } from "./config.registry";
import { ConfigResolver } from "./config.resolver";
import { ConfigService } from "./config.service";
import { ConfigDocumentStore } from "./config.store";
import { ConfigFileReadResult, ResolvedDoc, ResolvedDomain } from "./config.types";
import { angularDomain, qualityDomain, type ConfigCodec } from "./domains";
import {
    AngularSchemaProvider,
    ConfigSchema as ConfigSchemaV2,
    DomainSchemaDoc,
    DomainSchemaProvider,
    DomainSchemaRegistry,
} from "./schema";
import type { DomainSchemaContext, DomainSchemaDiffResult } from "./schema/schema.types";

export class ConfigServiceImpl implements ConfigService {
    private readonly fileLock = new FileLock();
    private readonly registry: ConfigRegistry = new ConfigRegistry();
    private readonly resolver: ConfigResolver = new ConfigResolver();
    private readonly store: ConfigDocumentStore = new ConfigDocumentStore();
    private readonly schemaRegistry = new DomainSchemaRegistry();

    private catalogCache = new Map<string, { rootDir: string; catalog: ResolvedDomain[]; ts: number }>();

    private readonly CATALOG_TTL = 2000; // 2s，MVP 足够

    constructor(private projectService: ProjectService) {
        this.registry.registerMany([angularDomain, qualityDomain]);
        this.schemaRegistry.register(new AngularSchemaProvider());
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
            throw new AppError("CONFIG_READ_FAILED", "config doc not found on disk", {
                docId,
                projectId,
                rootDir: project.root,
            });
        }
        const result = this.store.read(rd.absPath, rd.chosen.codec);
        return { ...result, relPath: rd.chosen.relPath };
    }

    /**
     * 注意：writeDoc 仍然保留（可用于“整文件覆盖写入”场景）
     * 但 DomainSchema 写回已改为 patchJsonLike，以最大限度保留原文件格式
     */
    async writeDoc(projectId: string, docId: string, next: unknown): Promise<void> {
        const project = await this.projectService.get(projectId);
        const catalog = this.getCachedCatalog(projectId, project.root);
        const rd = this.findResolvedDoc(catalog, docId);

        if (rd?.exists && rd.absPath && rd.chosen) {
            await this.fileLock.withLock(rd.absPath, async () => {
                // 仍按原逻辑：全量写（会重排格式）；留给非 schema 的场景使用
                this.store.write(rd.absPath!, rd.chosen!.codec, next, { format: "pretty" });
            });
            this.catalogCache.delete(projectId);
            return;
        }
        throw new AppError("CONFIG_WRITE_FAILED", "unknown config docId", { docId, projectId, rootDir: project.root });
    }

    async openDoc(projectId: string, docId: string): Promise<{ root: string; filePath: string }> {
        const project = await this.projectService.get(projectId);
        const catalog = this.getCachedCatalog(projectId, project.root);
        const rd = this.findResolvedDoc(catalog, docId);
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
        return provider.assemble(docsData, ctx);
    }

    /**
     * DomainSchema 写回：
     * - 不再 deepMerge + 全量 stringify（会改格式/写入默认字段）
     * - 改为：根据 provider.diff 的 docPatch/filePatch，使用 store.patchJsonLike 增量写回原文件
     */
    async writeDomainSchema(projectId: string, domainId: string, nextVM: any) {
        const project = await this.projectService.get(projectId);
        const provider = this.getProvider(domainId);
        const ctx = this.buildSchemaCtx(projectId, project.root);

        const baselineDocs = await this.getBaselineDocs(projectId, domainId);
        const baselineVM = provider.assemble(baselineDocs, ctx);

        provider.validate?.(nextVM, ctx);

        const diffRes: DomainSchemaDiffResult = provider.diff(baselineVM, nextVM, ctx);
        const docPatch = diffRes.docPatch ?? {};
        const filePatch = diffRes.filePatch ?? [];

        // 用最新 catalog 定位 docId -> absPath/codec
        const catalog = this.getCachedCatalog(projectId, project.root);

        // 1) 写回 domain docs（docId）
        for (const [docId, patch] of Object.entries(docPatch)) {
            const rd = this.findResolvedDoc(catalog, docId);
            if (!rd?.exists || !rd.absPath || !rd.chosen) {
                throw new AppError("CONFIG_WRITE_FAILED", "docPatch target not found on disk", {
                    projectId,
                    domainId,
                    docId,
                });
            }

            await this.fileLock.withLock(rd.absPath, async () => {
                this.store.patchJsonLike(rd.absPath!, rd.chosen!.codec, patch, {
                    formatting: { insertSpaces: true, tabSize: 2, eol: "\n" },
                });
            });
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
            // ctx.writeFile 在本实现里也是 patch 写回
            await ctx.writeFile(fp.relPath, fp.codec, fp.patch);
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
        const domain = catalog.find((d) => d.domain.id === domainId);
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
     */
    private getCachedCatalog(projectId: string, rootDir: string): ResolvedDomain[] {
        const hit = this.catalogCache.get(projectId);
        const now = Date.now();
        if (hit && hit.rootDir === rootDir && now - hit.ts < this.CATALOG_TTL) {
            return hit.catalog;
        }
        const catalog = this.resolveCatalog(rootDir);
        this.catalogCache.set(projectId, { rootDir, catalog, ts: now });
        return catalog;
    }

    /**
     * 从 catalog 中获取指定 doc
     */
    private findResolvedDoc(catalog: ResolvedDomain[], docId: string): ResolvedDoc | undefined {
        for (const d of catalog) {
            const rd = d.docs.find((x) => x.spec.id === docId);
            if (rd) return rd;
        }
        return undefined;
    }

    /**
     * 构建 DomainSchemaContext
     * - readFile：读取并返回 data/raw/absPath
     * - writeFile：改为“patch 写回”（使用 store.patchJsonLike）
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
            writeFile: async (relPath: string, codec: ConfigCodec, patch: any) => {
                const absPath = path.resolve(rootDir, relPath);
                await this.fileLock.withLock(absPath, async () => {
                    this.store.patchJsonLike(absPath, codec, patch, {
                        formatting: { insertSpaces: true, tabSize: 2, eol: "\n" },
                    });
                });
            },
        } satisfies DomainSchemaContext;
    }
}
