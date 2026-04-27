import * as path from "node:path";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { FileLock } from "@yinuo-ngm/storage";
import { type ProjectService } from "@yinuo-ngm/project";
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

    private readonly CATALOG_TTL = 2000;

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
        if (!rd) throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `unknown config docId: ${docId}`, { docId, projectId });
        if (!rd.exists || !rd.absPath || !rd.chosen) {
            throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `config doc not found on disk: ${docId}`, {
                docId,
                projectId,
                rootDir: project.root,
            });
        }
        const result = this.store.read(rd.absPath, rd.chosen.codec);
        return { ...result, relPath: rd.chosen.relPath };
    }

    async writeDoc(projectId: string, docId: string, next: unknown): Promise<void> {
        const project = await this.projectService.get(projectId);
        const catalog = this.getCachedCatalog(projectId, project.root);
        const rd = this.findResolvedDoc(catalog, docId);

        if (rd?.exists && rd.absPath && rd.chosen) {
            await this.fileLock.withLock(rd.absPath, async () => {
                this.store.write(rd.absPath!, rd.chosen!.codec, next, { format: "pretty" });
            });
            this.catalogCache.delete(projectId);
            return;
        }
        throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `unknown config docId: ${docId}`, { docId, projectId, rootDir: project.root });
    }

    async openDoc(projectId: string, docId: string): Promise<{ root: string; filePath: string }> {
        const project = await this.projectService.get(projectId);
        const catalog = this.getCachedCatalog(projectId, project.root);
        const rd = this.findResolvedDoc(catalog, docId);
        if (!rd) throw new CoreError(CoreErrorCodes.CONFIG_OPEN_FAILED, `unknown config docId: ${docId}`, { docId, projectId });
        if (!rd.exists || !rd.absPath || !rd.chosen) {
            throw new CoreError(CoreErrorCodes.CONFIG_OPEN_FAILED, `config doc not found on disk: ${docId}`, { docId, projectId, rootDir: project.root });
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
            meta: {},
        };
    }

    async readDomainSchema(projectId: string, domainId: string) {
        const project = await this.projectService.get(projectId);
        const provider = this.getProvider(domainId);
        const docsData = await this.getBaselineDocs(projectId, domainId);
        const ctx = this.buildSchemaCtx(projectId, project.root);
        return provider.assemble(docsData, ctx);
    }

    async writeDomainSchema(projectId: string, domainId: string, nextVM: any) {
        const diffRes = await this.diffDomainSchema(projectId, domainId, nextVM);
        const docPatch = diffRes.docPatch ?? {};
        const filePatch = diffRes.filePatch ?? [];
        const project = diffRes.project!;
        const ctx = diffRes.ctx;

        const catalog = this.getCachedCatalog(projectId, project.root);

        for (const [docId, patch] of Object.entries(docPatch)) {
            const rd = this.findResolvedDoc(catalog, docId);
            if (!rd?.exists || !rd.absPath || !rd.chosen) {
                throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `docPatch target not found on disk: ${docId}`, {
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

        for (const fp of filePatch) {
            if (!fp?.relPath) {
                throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, `filePatch.relPath is required`, {
                    projectId,
                    domainId,
                    fp,
                });
            }
            await ctx.writeFile(fp.relPath, fp.codec, fp.patch);
        }

        this.catalogCache.delete(projectId);
    }

    async diffDomainSchema(projectId: string, domainId: string, nextVM: any): Promise<DomainSchemaDiffResult & { project: any; ctx: DomainSchemaContext }> {
        const project = await this.projectService.get(projectId);
        const provider = this.getProvider(domainId);
        const ctx = this.buildSchemaCtx(projectId, project.root);

        const baselineDocs = await this.getBaselineDocs(projectId, domainId);
        const baselineVM = provider.assemble(baselineDocs, ctx);

        provider.validate?.(nextVM, ctx);
        const diffRes: DomainSchemaDiffResult = provider.diff(baselineVM, nextVM, ctx);
        return {
            docPatch: diffRes.docPatch ?? {},
            filePatch: diffRes.filePatch ?? [],
            project,
            ctx,
        };
    }

    private getProvider(domainId: string): DomainSchemaProvider {
        const provider = this.schemaRegistry.get(domainId);
        if (!provider) {
            throw new CoreError(CoreErrorCodes.CONFIG_SCHEMA_NOT_FOUND, `schema provider not found: ${domainId}`, { domainId });
        }
        return provider;
    }

    private async getDomain(projectId: string, domainId: string): Promise<ResolvedDomain> {
        const catalog = await this.getCatalog(projectId);
        const domain = catalog.find((d) => d.domain.id === domainId);
        if (!domain) throw new CoreError(CoreErrorCodes.CONFIG_DOMAIN_NOT_FOUND, `domain not found: ${domainId}`, { domainId });
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

    private resolveCatalog(rootDir: string): ResolvedDomain[] {
        return this.resolver.resolveAll(rootDir, this.registry.list());
    }

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

    private findResolvedDoc(catalog: ResolvedDomain[], docId: string): ResolvedDoc | undefined {
        for (const d of catalog) {
            const rd = d.docs.find((x) => x.spec.id === docId);
            if (rd) return rd;
        }
        return undefined;
    }

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
