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
                configurations?: Record<string, string[]>;
            }[];
        };
        hydratedAt?: number;
    };
    hasPackageJson?: boolean;
    hasGit?: boolean;
    hasMakefile?: boolean;
    hasDockerCompose?: boolean;
    vite?: {
        found: {
            configPath: string;
            configFileName: string;
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
