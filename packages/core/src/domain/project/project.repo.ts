import type { Project } from "./project.types";

export interface ProjectRepo {
    list(): Promise<Project[]>;
    get(id: string): Promise<Project | null>;
    create(p: Project): Promise<void>;
    update(id: string, patch: Partial<Project>): Promise<Project>;
    remove(id: string): Promise<void>;
    findByRoot(root: string): Promise<Project | null>;
}