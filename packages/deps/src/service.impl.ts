import * as fs from "fs";
import * as path from "path";

import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ProjectService } from "@yinuo-ngm/project";
import type { DepGroup, DepItem, ProjectDepsResult } from "./types";
import type { DepsService, InstallDepOptions, UninstallDepOptions } from "./service";
import { CachedNpmRegistry, LatestCacheKv, NodeModulesReader, NpmDriver, NpmRegistryByCli } from "./infra";

function isSemverLike(v?: string) {
    return !!v && /^\d+\.\d+\.\d+/.test(v);
}

function hasUpdate(current?: string, latest?: string) {
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

function createLimiter(concurrency: number) {
    let active = 0;
    const queue: Array<() => void> = [];

    const next = () => {
        active--;
        const run = queue.shift();
        if (run) run();
    };

    return function limit<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const run = () => {
                active++;
                fn()
                    .then(resolve, reject)
                    .finally(next);
            };

            if (active < concurrency) run();
            else queue.push(run);
        });
    };
}

export class DepsServiceImpl implements DepsService {
    constructor(
        private projectService: ProjectService,
        private nodeModules: NodeModulesReader,
        private registry: CachedNpmRegistry,
        private npm: NpmDriver,
        private latestCache: LatestCacheKv,
    ) { }

    async list(projectId: string): Promise<ProjectDepsResult> {
        const project = await this.projectService.get(projectId);
        const root = project.root;

        const pkg = readPackageJson(root);

        const deps = pkg.dependencies ?? {};
        const devDeps = pkg.devDependencies ?? {};

        let registryOnline = true;
        const limit = createLimiter(5);

        const mapGroup = async (
            group: DepGroup,
            obj: Record<string, string>
        ): Promise<DepItem[]> => {
            const names = Object.keys(obj);

            const tasks = names.map((name) =>
                limit(async () => {
                    const required = obj[name];
                    const current = this.nodeModules.readInstalledVersion(root, name) ?? undefined;
                    const installed = !!current;

                    let latest: string | undefined = undefined;
                    try {
                        const v = await this.registry.getLatest(root, name);
                        if (v) latest = v;
                        else registryOnline = false;
                    } catch {
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

        const [dependencies, devDependencies] = await Promise.all([
            mapGroup("dependencies", deps),
            mapGroup("devDependencies", devDeps),
        ]);

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
            }
            spec = `${opts.name}@${opts.version}`;
        } else {
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
        const r = await this.npm.run(root, args);
        if (r.code !== 0) {
            throw new CoreError(CoreErrorCodes.DEP_UNINSTALL_FAILED, r.stderr || r.stdout || `npm uninstall failed: ${opts.name}`, { name: opts.name });
        }
    }
}
