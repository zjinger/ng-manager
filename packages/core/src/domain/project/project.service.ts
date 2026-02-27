import { ProjectMeta } from "./project.meta";
import { CheckRootResult, CreateProjectInput, ImportCheckResult, Project, ProjectAssets } from "./project.types";

export interface ProjectService {
    list(): Promise<Project[]>;
    get(id: string): Promise<Project>;
    create(input: CreateProjectInput): Promise<Project>;
    update(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>): Promise<Project>;
    remove(id: string): Promise<void>;

    // check
    /** 检查 root 是否可用于 create/import（轻量，不 scan） */
    checkRoot(rootPath: string): Promise<CheckRootResult>;
    /** 检查 root 是否是一个可导入的项目 */
    checkImport(rootPath: string): Promise<ImportCheckResult>;
    // command
    importProject(input: { root: string; name?: string }): Promise<Project>;
    // 从磁盘重新扫描并回填 scripts
    refreshScripts(id: string): Promise<Project>;
    // 扫描指定路径，得到 ProjectMeta
    scan(root: string): Promise<ProjectMeta>;

    setFavorite(id: string, isFavorite: boolean): Promise<Project>;
    toggleFavorite(id: string): Promise<Project>;

    setLastOpened(id: string, timestamp: number): Promise<Project>;
    rename(id: string, name: string): Promise<Project>;
    edit(id: string, data: { name: string; description?: string; repoPageUrl?: string; }): Promise<Project>;
    // 更新项目的 assets 信息
    updateAssets(id: string, assets: ProjectAssets): Promise<Project>;

    getAssets(id: string): Promise<ProjectAssets | null>;

}