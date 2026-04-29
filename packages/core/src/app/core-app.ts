import type { CoreApp, CreateCoreAppOptions } from "./types";
import {
    createBootstrapDomain,
    createConfigDomain,
    createDashboardDomain,
    createDepsDomain,
    createFsDomain,
    createInfra,
    createNodeVersionDomain,
    createSpriteDomain,
    createSvnDomain,
    createTaskDomain,
} from "./composers";
import { createProjectDomain } from "@yinuo-ngm/project";

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
    const project = await createProjectDomain(infra.dataDir);
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
        project,
    });
    if (depsHandle.dispose) {
        disposables.push(depsHandle.dispose);
    }
    const dashboard = createDashboardDomain(infra.dataDir);
    const config = createConfigDomain(project);
    const sprite = createSpriteDomain({
        dataDir: infra.dataDir,
        cacheDir: infra.cacheDir,
        project,
        sysLog: infra.sysLog,
    });
    const svnSync = createSvnDomain({
        dataDir: infra.dataDir,
        events: infra.events,
        sysLog: infra.sysLog,
        project,
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
        async dispose() {
            for (const dispose of disposables.reverse()) {
                await dispose();
            }
        }
    }
}
