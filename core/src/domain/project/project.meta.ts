
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
        angularJsonPath: string;
        defaultProject?: string;
        projects: {
            name: string;
            targets: string[];
            configurations: string[];
        }[];
    };

    hasPackageJson?: boolean;
    hasGit?: boolean;
    hasMakefile?: boolean;
    hasDockerCompose?: boolean;

    vite?: {
        configPath?: string;
    };

    detectedAt: number;
}
