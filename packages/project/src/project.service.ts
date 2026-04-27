import { ProjectMeta } from "./project.meta";
import { CheckRootResult, CreateProjectInput, ImportCheckResult, Project, ProjectAssets } from "./project.types";

export interface ProjectService {
    list(): Promise<Project[]>;
    get(id: string): Promise<Project>;
    create(input: CreateProjectInput): Promise<Project>;
    update(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>): Promise<Project>;
    remove(id: string): Promise<void>;
    checkRoot(rootPath: string): Promise<CheckRootResult>;
    checkImport(rootPath: string): Promise<ImportCheckResult>;
    importProject(input: { root: string; name?: string }): Promise<Project>;
    refreshScripts(id: string): Promise<Project>;
    scan(root: string): Promise<ProjectMeta>;
    setFavorite(id: string, isFavorite: boolean): Promise<Project>;
    toggleFavorite(id: string): Promise<Project>;
    setLastOpened(id: string, timestamp: number): Promise<Project>;
    rename(id: string, name: string): Promise<Project>;
    edit(id: string, data: { name: string; description?: string; repoPageUrl?: string; }): Promise<Project>;
    updateAssets(id: string, assets: ProjectAssets): Promise<Project>;
    getAssets(id: string): Promise<ProjectAssets | null>;
}
