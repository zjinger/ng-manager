export type DepGroup = "dependencies" | "devDependencies";

export interface DepItem {
    name: string;
    current?: string;
    required?: string;
    latest?: string;
    installed: boolean;
    hasUpdate: boolean;
    group: DepGroup;
}

export interface ProjectDepsResult {
    dependencies: DepItem[];
    devDependencies: DepItem[];
    meta: {
        packageManager: "npm";
        registryOnline: boolean;
        voltaConfig?: string;
        enginesNode?: string;
    };
}

export interface InstallDepOptions {
    name: string;
    group: DepGroup;
    target: "required" | "latest" | "custom";
    version?: string;
}

export interface UninstallDepOptions {
    name: string;
    group: DepGroup;
}
