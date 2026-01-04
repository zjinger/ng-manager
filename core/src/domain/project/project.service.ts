import { ProjectMeta } from "./project.meta";
import { Project } from "./project.model";

export interface CreateProjectInput {
    name: string;
    root: string;
    scripts?: Project["scripts"];
    env?: Record<string, string>;
}

export interface ProjectService {
    list(): Promise<Project[]>;
    get(id: string): Promise<Project>;
    create(input: CreateProjectInput): Promise<Project>;
    update(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>): Promise<Project>;
    remove(id: string): Promise<void>;
    // 从磁盘重新扫描并回填 scripts
    refreshScripts(id: string): Promise<Project>;
    // 扫描指定路径，得到 ProjectMeta
    scan(root: string): Promise<ProjectMeta>;
}