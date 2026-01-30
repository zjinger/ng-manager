import type { Project } from "../../domain/project/project.types";
import type { ProjectRepo } from "../../domain/project/project.repo";
import type { IKvRepo } from "../storage/kv.repo";
import { AppError } from "../../common/errors";

export class ProjectRepoJsonKv implements ProjectRepo {
    constructor(private kv: IKvRepo<Project>) { }

    async list(): Promise<Project[]> {
        return this.kv.list();
    }

    async get(id: string): Promise<Project | null> {
        return this.kv.get(id);
    }

    async findByRoot(root: string): Promise<Project | null> {
        const all = await this.kv.list();
        return all.find((p) => p.root === root) ?? null;
    }

    async create(p: Project): Promise<void> {
        // 可选：防重复
        const existed = await this.kv.get(p.id);
        if (existed) throw new AppError('PROJECT_ALREADY_EXISTS', `Project already exists: ${p.id}`);
        await this.kv.set(p.id, p);
    }

    async update(id: string, patch: Partial<Project>): Promise<Project> {
        const cur = await this.kv.get(id);
        if (!cur) throw new AppError('PROJECT_NOT_FOUND', `Project not found: ${id}`);
        const next = { ...cur, ...patch };
        await this.kv.set(id, next);
        return next;
    }

    async remove(id: string): Promise<void> {
        await this.kv.delete(id);
    }
}
