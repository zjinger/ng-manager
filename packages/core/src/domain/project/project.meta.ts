
export type ProjectFramework =
    | "angular"
    | "vue"
    | "react"
    | "node"
    | "unknown";

export type PackageManager = "npm" | "pnpm" | "yarn" | "unknown";

export interface ProjectMeta {
    rootDir: string;

    name?: string;
    framework: ProjectFramework;
    packageManager: PackageManager;

    scripts: Record<string, string>;
    /** scanner: 发现 angular.json；inspector: 按需解析快照 */
    angular?: {
        found: {
            angularJsonPath: string;
        };
        snapshot?: {
            version?: number;
            defaultProject?: string;
            projects: {
                name: string;
                root?: string;
                sourceRoot?: string;
                projectType?: string;
                targets: string[];
                configurations?: Record<string, string[]>; // build/serve/test... -> ["production"...]
            }[];
        };
        hydratedAt?: number;
    };

    hasPackageJson?: boolean;
    hasGit?: boolean;
    hasMakefile?: boolean;
    hasDockerCompose?: boolean;

    /** scanner: 发现 vite config；inspector: 按需判定/抽取少量信息 */
    vite?: {
        found: {
            configPath: string;
            configFileName: string; // vite.config.ts / js / mjs / cjs
        }
        snapshot?: {
            mode: "static" | "dynamic" | "unknown";
            base?: string;
            build?: { outDir?: string; sourcemap?: boolean };
            server?: { port?: number };
        };
        hydratedAt?: number;
    };

    detectedAt: number;
}
