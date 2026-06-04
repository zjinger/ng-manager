import type {
    NodeRuntimeConfigDto,
    NodeRuntimeRecordDto,
    NodeRuntimeTestResultDto,
    ResolveNodeRuntimeRequestDto,
    ResolvedNodeRuntimeDto,
    TestNodeRuntimeRequestDto,
} from "@yinuo-ngm/protocol";
import type { NodeRuntimeConfig, NodeRuntimeRecord, NodeRuntimeTestResult, ResolvedNodeRuntime } from "@yinuo-ngm/core";
import type { FastifyInstance } from "fastify";

function toNodeRuntimeConfig(input?: NodeRuntimeConfigDto): NodeRuntimeConfig | undefined {
    return input as NodeRuntimeConfig | undefined;
}

function toNodeRuntimeRecordDto(record: NodeRuntimeRecord): NodeRuntimeRecordDto {
    return {
        id: record.id,
        name: record.name,
        version: record.version,
        platform: String(record.platform),
        arch: String(record.arch),
        rootDir: record.rootDir,
        nodePath: record.nodePath,
        npmPath: record.npmPath,
        npxPath: record.npxPath,
        pnpmPath: record.pnpmPath,
        yarnPath: record.yarnPath,
        npmCliPath: record.npmCliPath,
        npxCliPath: record.npxCliPath,
        source: record.source,
    };
}

function toResolvedNodeRuntimeDto(runtime: ResolvedNodeRuntime): ResolvedNodeRuntimeDto {
    return {
        type: runtime.type,
        name: runtime.name,
        version: runtime.version,
        packageManager: runtime.packageManager,
        rootDir: runtime.rootDir,
        binDir: runtime.binDir,
        nodePath: runtime.nodePath,
        npmPath: runtime.npmPath,
        npxPath: runtime.npxPath,
        pnpmPath: runtime.pnpmPath,
        yarnPath: runtime.yarnPath,
        npmCliPath: runtime.npmCliPath,
        npxCliPath: runtime.npxCliPath,
        env: runtime.env,
        source: runtime.source,
    };
}

function toNodeRuntimeTestResultDto(result: NodeRuntimeTestResult): NodeRuntimeTestResultDto {
    return {
        ok: result.ok,
        nodeVersion: result.nodeVersion,
        npmVersion: result.npmVersion,
        nodePath: result.nodePath,
        npmLaunchCommand: result.npmLaunchCommand,
        errors: result.errors,
    };
}

export default async function nodeRuntimeRoutes(fastify: FastifyInstance) {
    fastify.get("/", async () => {
        const runtimes = await fastify.core.nodeRuntime.listRuntimes();
        return runtimes.map(toNodeRuntimeRecordDto);
    });

    fastify.post("/resolve", async (req) => {
        const body = req.body as ResolveNodeRuntimeRequestDto | undefined;
        const runtime = await fastify.core.nodeRuntime.resolveRuntime(toNodeRuntimeConfig(body?.runtime));
        return toResolvedNodeRuntimeDto(runtime);
    });

    fastify.post("/test", async (req) => {
        const body = req.body as TestNodeRuntimeRequestDto | undefined;
        const result = await fastify.core.nodeRuntime.testRuntime(toNodeRuntimeConfig(body?.runtime) || { type: "system" });
        return toNodeRuntimeTestResultDto(result);
    });
}
