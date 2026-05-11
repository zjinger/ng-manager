import type { CoreApp, CreateCoreAppOptions } from "./types";
import {
    createApiClientDomain,
    createBootstrapDomain,
    createConfigDomain,
    createDashboardDomain,
    createDepsDomain,
    createFsDomain,
    createInfra,
    createNginxDomain,
    createNodeVersionDomain,
    createSpriteDomain,
    createSvnDomain,
    createTaskDomain,
} from "./composers";
import { runAppStorageMigrations } from "../infra/storage";
import { createProjectDomain } from "@yinuo-ngm/project";
import { createAppStorageContext } from "@yinuo-ngm/storage";

/**
 * 创建 CoreApp
 * - 本地唯一实例（单用户、单进程假设）
 * - 所有核心能力的装配入口
 */
export async function createCoreApp(
    opts: CreateCoreAppOptions
): Promise<CoreApp> {
    const disposables: Array<() => Promise<void> | void> = [];

    const infra = createInfra(opts);
    const storage = createAppStorageContext({ dataDir: infra.dataDir });
    disposables.push(() => storage.close());
    await runAppStorageMigrations({
        dataDir: infra.dataDir,
        cacheDir: infra.cacheDir,
        db: storage.db,
    });
    const project = await createProjectDomain({
        dataDir: infra.dataDir,
        db: storage.db,
        migrateIfNeeded: false,
    });
    const nodeVersion = createNodeVersionDomain(infra.sysLog);
    const task = createTaskDomain({
        project,
        processService: infra.processService,
        sysLog: infra.sysLog,
        taskStreamLogStore: infra.taskStreamLogStore,
        events: infra.events,
        nodeVersion,
    });
    const bootstrap = createBootstrapDomain({
        project,
        task,
        events: infra.events,
        sysLog: infra.sysLog,
    });
    const fs = createFsDomain();
    const depsHandle = await createDepsDomain({
        cacheDir: infra.cacheDir,
        db: storage.db,
        project,
        migrateIfNeeded: false,
    });
    if (depsHandle.dispose) {
        disposables.push(depsHandle.dispose);
    }
    const dashboard = await createDashboardDomain({
        dataDir: infra.dataDir,
        db: storage.db,
        migrateIfNeeded: false,
    });
    const config = createConfigDomain(project);
    const sprite = createSpriteDomain({
        dataDir: infra.dataDir,
        cacheDir: infra.cacheDir,
        db: storage.db,
        project,
        sysLog: infra.sysLog,
        migrateIfNeeded: false,
    });
    const svnSync = createSvnDomain({
        dataDir: infra.dataDir,
        db: storage.db,
        events: infra.events,
        sysLog: infra.sysLog,
        project,
        migrateIfNeeded: false,
    });
    const nginxHandle = await createNginxDomain({
        dataDir: infra.dataDir,
        db: storage.db,
        migrateIfNeeded: false,
    });
    if (nginxHandle.dispose) {
        disposables.push(nginxHandle.dispose);
    }
    const apiClientHandle = await createApiClientDomain({
        dataDir: infra.dataDir,
        db: storage.db,
        migrateIfNeeded: false,
    });

    return {
        events: infra.events,
        sysLog: infra.sysLog,
        task,
        project,
        bootstrap,
        fs,
        deps: depsHandle.service,
        dashboard,
        config,
        sprite,
        svnSync,
        nodeVersion,
        nginx: nginxHandle.service,
        apiClient: apiClientHandle.service,
        async dispose() {
            for (const dispose of disposables.reverse()) {
                await dispose();
            }
        }
    }
}
