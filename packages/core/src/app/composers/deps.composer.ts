import * as path from "path";

import { DepsServiceImpl } from "../../domain/deps";
import type { ProjectService } from "@yinuo-ngm/project";
import {
    CachedNpmRegistry,
    LatestCacheKv,
    type LatestCacheSnapshot,
    NodeModulesReader,
    NpmDriver,
    NpmRegistryByCli,
} from "../../infra/deps";
import { JsonFileKvRepo } from "../../infra/storage/json-file-kv.repo";

export async function createDepsDomain(opts: {
    cacheDir: string;
    project: ProjectService;
}) {
    const latestRepo = new JsonFileKvRepo<LatestCacheSnapshot>(
        path.join(opts.cacheDir, "npm-latest.kv.json")
    );
    const latestCache = new LatestCacheKv(latestRepo, "npm-latest", {
        ttlOkMs: 6 * 60 * 60 * 1000,
        ttlFailMs: 2 * 60 * 1000,
        maxSize: 2000,
        flushDebounceMs: 800,
    });

    await latestCache.load();

    latestCache.startPruneTimer(
        1 * 60 * 60 * 1000,
        (removed) => {
            console.debug(`[deps:latestCache] pruned ${removed} expired entries`);
        }
    );

    const npm = new NpmDriver({ timeoutMs: 120_000 });
    const registryRaw = new NpmRegistryByCli(npm);
    const nodeModules = new NodeModulesReader();
    const registry = new CachedNpmRegistry(registryRaw, latestCache);
    const deps = new DepsServiceImpl(
        opts.project,
        nodeModules,
        registry,
        npm,
        latestCache
    );

    return {
        deps,
        latestCache,
    };
}
