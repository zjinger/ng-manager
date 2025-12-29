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
}