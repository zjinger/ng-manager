import { GlobalError, GlobalErrorCodes, CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";
import type {
    WriteDocRequestDto,
    WriteSchemaRequestDto,
    DiffSchemaRequestDto,
    OpenDocResponseDto,
    WriteSchemaResponseDto,
    ResolvedDomainDto,
    ConfigFileReadResultDto,
    DomainSchemaDocDto,
    DomainSchemaDiffResultDto,
} from "@yinuo-ngm/protocol";
import type { ConfigService } from "@yinuo-ngm/config";
import { openFolder } from "../common/editor";

function toResolvedDomainDto(domain: import("@yinuo-ngm/config").ResolvedDomain): ResolvedDomainDto {
    return {
        domainId: domain.domain.id,
        label: domain.domain.label,
        icon: domain.domain.icon,
        description: domain.domain.description,
        docs: domain.docs.map(doc => ({
            spec: {
                id: doc.spec.id,
                title: doc.spec.title,
                kind: doc.spec.kind,
                candidates: doc.spec.candidates,
                missing: doc.spec.missing,
                writable: doc.spec.writable,
                policy: doc.spec.policy,
            },
            exists: doc.exists,
            chosen: doc.chosen,
            absPath: doc.absPath,
        })),
        nav: domain.domain.nav,
    };
}

function toConfigFileReadResultDto(result: import("@yinuo-ngm/config").ConfigFileReadResult): ConfigFileReadResultDto {
    return {
        codec: result.codec,
        absPath: result.absPath,
        relPath: result.relPath,
        raw: result.raw,
        data: result.data,
    };
}

function toDomainSchemaDocDto<VM>(doc: import("@yinuo-ngm/config").DomainSchemaDoc<VM>): DomainSchemaDocDto<VM> {
    return doc as DomainSchemaDocDto<VM>;
}

function toDomainSchemaDiffResultDto(result: import("@yinuo-ngm/config").DomainSchemaDiffResult): DomainSchemaDiffResultDto {
    return result as DomainSchemaDiffResultDto;
}

export default async function configRoutes(fastify: FastifyInstance) {
    const config = fastify.core.config as ConfigService;

    fastify.get<{ Params: { projectId: string } }>("/catalog/:projectId", async (req) => {
        const { projectId } = req.params;
        const domains = await config.getCatalog(projectId);
        return domains.map(toResolvedDomainDto);
    });

    fastify.get<{ Params: { projectId: string; docId: string } }>("/readDoc/:projectId/:docId", async (req) => {
        const { projectId, docId } = req.params;
        const result = await config.readDoc(projectId, docId);
        return toConfigFileReadResultDto(result);
    });

    fastify.post<{ Params: { projectId: string; docId: string }; Body: Partial<WriteDocRequestDto> }>(
        "/writeDoc/:projectId/:docId",
        async (req) => {
            const { projectId, docId } = req.params;
            const body = req.body as Partial<WriteDocRequestDto>;
            const next = body?.raw ?? body?.data;
            if (next === undefined) {
                throw new CoreError(CoreErrorCodes.CONFIG_WRITE_FAILED, "missing body.raw or body.data", { projectId, docId });
            }
            await config.writeDoc(projectId, docId, next);
        }
    );

    fastify.post<{ Params: { projectId: string; docId: string } }>(
        "/openInEditor/:projectId/:docId",
        async (req) => {
            try {
                const { projectId, docId } = req.params;
                const { filePath } = await config.openDoc(projectId, docId);
                await openFolder(filePath, { editor: 'code' });
                return { ok: true, filePath } as OpenDocResponseDto;
            } catch (e: unknown) {
                throw new CoreError(CoreErrorCodes.EDITOR_LAUNCH_FAILED, e instanceof Error ? e.message : "openInEditor failed");
            }
        }
    );

    fastify.get<{ Params: { projectId: string; domainId: string } }>(
        "/readSchema/:projectId/:domainId",
        async (req) => {
            const { projectId, domainId } = req.params;
            return await config.readDomainSchema(projectId, domainId);
        }
    );

    fastify.post<{ Params: { projectId: string; domainId: string }; Body: Partial<WriteSchemaRequestDto> }>(
        "/writeSchema/:projectId/:domainId",
        async (req) => {
            const { projectId, domainId } = req.params;
            const body = req.body as Partial<WriteSchemaRequestDto>;
            const vm = body?.vm;
            if (vm === undefined) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "missing body.vm");
            }
            await config.writeDomainSchema(projectId, domainId, vm);
            return { projectId, domainId } as WriteSchemaResponseDto;
        }
    );

    fastify.get<{ Params: { projectId: string; domainId: string } }>(
        "/getDomainSchema/:projectId/:domainId",
        async (req) => {
            const { projectId, domainId } = req.params;
            const doc = await config.getDomainSchemaDoc(projectId, domainId);
            return toDomainSchemaDocDto(doc);
        }
    );

    fastify.post<{ Params: { projectId: string; domainId: string }; Body: Partial<DiffSchemaRequestDto> }>(
        "/diffSchema/:projectId/:domainId",
        async (req) => {
            const { projectId, domainId } = req.params;
            const body = req.body as Partial<DiffSchemaRequestDto>;
            const vm = body?.vm;
            if (vm === undefined) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "missing body.vm");
            }
            const result = await config.diffDomainSchema(projectId, domainId, vm);
            return toDomainSchemaDiffResultDto(result);
        }
    );
}