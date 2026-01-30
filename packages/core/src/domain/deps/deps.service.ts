import type { DepGroup, ProjectDepsResult } from "./deps.types";

export interface InstallDepOptions {
    name: string;
    group: DepGroup;
    target: "required" | "latest" | "custom";
    version?: string; // target=custom
}

export interface UninstallDepOptions {
    name: string;
    group: DepGroup;
}

export interface DepsService {
    list(projectId: string): Promise<ProjectDepsResult>;
    install(projectId: string, opts: InstallDepOptions): Promise<void>;
    uninstall(projectId: string, opts: UninstallDepOptions): Promise<void>;
}
