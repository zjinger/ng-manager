import type { DepGroup, InstallDepOptions, ProjectDepsResult, UninstallDepOptions } from './types';
export type { DepGroup, InstallDepOptions, UninstallDepOptions };

export interface DepsService {
    list(projectId: string): Promise<ProjectDepsResult>;
    install(projectId: string, opts: InstallDepOptions): Promise<void>;
    uninstall(projectId: string, opts: UninstallDepOptions): Promise<void>;
}
