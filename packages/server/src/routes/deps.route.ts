import type { FastifyInstance } from "fastify";
import type {
    DepItemDto,
    InstallDepRequestDto,
    ProjectDepsMetaDto,
    UninstallDepRequestDto,
    ProjectDepsResultDto,
    OkResponseDto,
} from "@yinuo-ngm/protocol";
import type { DepsService } from "@yinuo-ngm/deps";
import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";

function toDepItemDto(item: import("@yinuo-ngm/deps").DepItem): DepItemDto {
    return {
        name: item.name,
        current: item.current,
        required: item.required,
        latest: item.latest,
        installed: item.installed,
        hasUpdate: item.hasUpdate,
        group: item.group,
    };
}

function toProjectDepsMetaDto(meta: import("@yinuo-ngm/deps").ProjectDepsResult["meta"]): ProjectDepsMetaDto {
    return {
        packageManager: meta.packageManager,
        registryOnline: meta.registryOnline,
        voltaConfig: meta.voltaConfig,
        enginesNode: meta.enginesNode,
    };
}

function toProjectDepsResultDto(result: import("@yinuo-ngm/deps").ProjectDepsResult): ProjectDepsResultDto {
    return {
        dependencies: result.dependencies.map(toDepItemDto),
        devDependencies: result.devDependencies.map(toDepItemDto),
        meta: toProjectDepsMetaDto(result.meta),
    };
}

export default async function depsRoutes(fastify: FastifyInstance) {
    const deps = fastify.core.deps as DepsService;

    fastify.get<{ Params: { projectId: string } }>(
        "/list/:projectId",
        async (req): Promise<ProjectDepsResultDto> => {
            const { projectId } = req.params;
            const result = await deps.list(projectId);
            return toProjectDepsResultDto(result);
        }
    );

    fastify.post<{ Params: { projectId: string }; Body: Partial<InstallDepRequestDto> }>(
        "/install/:projectId",
        async (req): Promise<OkResponseDto> => {
            const { projectId } = req.params;
            const body = req.body as Partial<InstallDepRequestDto>;
            if (!body.name || !body.group || !body.target) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "missing required fields: name, group, target");
            }
            await deps.install(projectId, {
                name: body.name,
                group: body.group,
                target: body.target,
                version: body.version,
            });
            return { ok: true };
        }
    );

    fastify.post<{ Params: { projectId: string }; Body: Partial<UninstallDepRequestDto> }>(
        "/uninstall/:projectId",
        async (req): Promise<OkResponseDto> => {
            const { projectId } = req.params;
            const body = req.body as Partial<UninstallDepRequestDto>;
            if (!body.name || !body.group) {
                throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "missing required fields: name, group");
            }
            await deps.uninstall(projectId, {
                name: body.name,
                group: body.group,
            });
            return { ok: true };
        }
    );

    fastify.post<{ Params: { projectId: string } }>(
        "/devtools/install/:projectId",
        async (): Promise<OkResponseDto> => {
            return { ok: true };
        }
    );
}
