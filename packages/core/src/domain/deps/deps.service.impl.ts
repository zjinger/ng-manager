import * as fs from "fs";
import * as path from "path";

import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ProjectService } from "@yinuo-ngm/project";
import type { DepGroup, DepItem, ProjectDepsResult } from "./deps.types";
import type { DepsService, InstallDepOptions, UninstallDepOptions } from "./deps.service";

import { NodeModulesReader, type INpmRegistry, NpmDriver, LatestCacheKv } from "../../infra/deps";
import { createLimiter } from "../../infra/utils";

function isSemverLike(v?: string) {
    return !!v && /^\d+\.\d+\.\d+/.test(v);
}

function hasUpdate(current?: string, latest?: string) {
    // 先做最小可用：只要 latest != current 且两者都像 semver 就提示更新
    if (!isSemverLike(current) || !isSemverLike(latest)) return false;
    return current !== latest;
}

function readPackageJson(root: string): { 
  dependencies?: Record<string, string>; 
  devDependencies?: Record<string, string>;
  volta?: { node?: string };
  engines?: { node?: string };
} {
    const p = path.join(root, "package.json");
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw);
}

export class DepsServiceImpl implements DepsService {
    constructor(
        private projectService: ProjectService,
        private nodeModules: NodeModulesReader,
        private registry: INpmRegistry,
        private npm: NpmDriver,
        private latestCache: LatestCacheKv,
    ) { }

    async list(projectId: string): Promise<ProjectDepsResult> {

        /**统计对象 */
        const start = Date.now();

        let statTotal = 0;
        let statCacheHit = 0;
        let statCacheMiss = 0;
        let statNpmView = 0;


        const project = await this.projectService.get(projectId);
        const root = project.root;

        const pkg = readPackageJson(root);

        const deps = pkg.dependencies ?? {};
        const devDeps = pkg.devDependencies ?? {};

        // latest 查询：离线会失败 -> latest=null
        let registryOnline = true;
        // 并发限制
        const limit = createLimiter(5);
        const mapGroup = async (
            group: DepGroup,
            obj: Record<string, string>
        ): Promise<DepItem[]> => {
            const names = Object.keys(obj);
            statTotal += names.length;

            const tasks = names.map((name) =>
                limit(async () => {
                    const required = obj[name];
                    const current =
                        this.nodeModules.readInstalledVersion(root, name) ?? undefined;
                    const installed = !!current;

                    const cacheKey = `npm:latest:${name}`;

                    // 👇 关键：先判断 cache 是否命中
                    if (this.latestCache.has(cacheKey)) {
                        statCacheHit++;
                    } else {
                        statCacheMiss++;
                    }

                    let latest: string | undefined = undefined;
                    try {
                        const v = await this.registry.getLatest(root, name);
                        statNpmView++;
                        if (v) latest = v;
                        else registryOnline = false;
                    } catch {
                        statNpmView++;
                        registryOnline = false;
                    }

                    return {
                        name,
                        required,
                        current,
                        latest,
                        installed,
                        hasUpdate: hasUpdate(current, latest),
                        group,
                    } satisfies DepItem;
                })
            );

            return Promise.all(tasks);
        };
        // const mapGroup = async (
        //     group: DepGroup,
        //     obj: Record<string, string>
        // ): Promise<DepItem[]> => {
        //     const names = Object.keys(obj);
        //     const tasks = names.map((name) =>
        //         limit(async () => {
        //             const required = obj[name];
        //             const current =
        //                 this.nodeModules.readInstalledVersion(root, name) ?? undefined;
        //             const installed = !!current;

        //             let latest: string | undefined = undefined;
        //             try {
        //                 const v = await this.registry.getLatest(root, name);
        //                 if (v) latest = v;
        //                 else registryOnline = false; // 保持你原来的逻辑
        //             } catch {
        //                 registryOnline = false;
        //             }

        //             return {
        //                 name,
        //                 required,
        //                 current,
        //                 latest,
        //                 installed,
        //                 hasUpdate: hasUpdate(current, latest),
        //                 group,
        //             } satisfies DepItem;
        //         })
        //     );
        //     return Promise.all(tasks);
        // };
        // const mapGroup = async (group: DepGroup, obj: Record<string, string>): Promise<DepItem[]> => {
        //     const names = Object.keys(obj);

        //     // 控制并发：避免 npm view 同时太多（简化起见串行）
        //     const items: DepItem[] = [];
        //     for (const name of names) {
        //         const required = obj[name];
        //         const current = this.nodeModules.readInstalledVersion(root, name) ?? undefined;
        //         const installed = !!current;

        //         let latest: string | undefined = undefined;
        //         try {
        //             const v = await this.registry.getLatest(root, name);
        //             if (v) latest = v;
        //             else registryOnline = false; // 可能离线/registry不可达
        //         } catch {
        //             registryOnline = false;
        //         }

        //         items.push({
        //             name,
        //             required,
        //             current,
        //             latest,
        //             installed,
        //             hasUpdate: hasUpdate(current, latest),
        //             group,
        //         });
        //     }
        //     return items;
        // };

        const [dependencies, devDependencies] = await Promise.all([
            mapGroup("dependencies", deps),
            mapGroup("devDependencies", devDeps),
        ]);

        // const elapsedMs = Date.now() - start;
        // console.debug(
        //     `[deps:list] total=${statTotal}, cacheHit=${statCacheHit}, cacheMiss=${statCacheMiss}, npmView=${statNpmView}, concurrency=5, elapsed=${elapsedMs}ms`
        // );
        /**获取项目Node版本要求 */
        const voltaConfig = pkg.volta?.node;
        const enginesNode = pkg.engines?.node;
        return {
            dependencies,
            devDependencies,
            meta: {
                packageManager: "npm",
                registryOnline,
                voltaConfig,
                enginesNode,
            },
        };
    }

    async install(projectId: string, opts: InstallDepOptions): Promise<void> {
        const project = await this.projectService.get(projectId);
        const root = project.root;

        const pkg = readPackageJson(root);
        const requiredRange =
            opts.group === "dependencies"
                ? pkg.dependencies?.[opts.name]
                : pkg.devDependencies?.[opts.name];

        let spec: string;
        if (opts.target === "latest") spec = `${opts.name}@latest`;
        else if (opts.target === "custom") {
            if (!opts.version) {
                throw new CoreError(CoreErrorCodes.DEP_INSTALL_FAILED, "version is required when target=custom", { name: opts.name });
            };
            spec = `${opts.name}@${opts.version}`;
        } else {
            // required
            spec = requiredRange ? `${opts.name}@${requiredRange}` : opts.name;
        }

        const args = ["install", spec];
        if (opts.group === "devDependencies") args.push("--save-dev");

        const r = await this.npm.run(root, args);
        if (r.code !== 0) {
            throw new CoreError(CoreErrorCodes.DEP_INSTALL_FAILED, r.stderr || r.stdout || `npm install failed: ${spec}`, { spec });
        }
    }

    async uninstall(projectId: string, opts: UninstallDepOptions): Promise<void> {
        const project = await this.projectService.get(projectId);
        const root = project.root;

        const args = ["uninstall", opts.name];
        // npm uninstall 会按 package.json 自动移除 dependencies/devDependencies，不需要额外参数
        const r = await this.npm.run(root, args);
        if (r.code !== 0) {
            throw new CoreError(CoreErrorCodes.DEP_UNINSTALL_FAILED, r.stderr || r.stdout || `npm uninstall failed: ${opts.name}`, { name: opts.name });
        }
    }
}
