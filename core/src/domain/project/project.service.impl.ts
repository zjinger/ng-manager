import { AppError } from "../../common/errors";
import { genId } from "../../common/id";
import type { ProjectRepo } from "./project.repo";
import type { Project } from "./project.model";
import type { CreateProjectInput, ProjectService } from "./project.service";
import { scanProject } from "./project.scanner";
import { ProjectMeta } from "./project.meta";

export class ProjectServiceImpl implements ProjectService {
    constructor(private repo: ProjectRepo) { }

    async list(): Promise<Project[]> {
        return this.repo.list();
    }

    async get(id: string): Promise<Project> {
        const p = await this.repo.get(id);
        if (!p) throw new AppError("PROJECT_NOT_FOUND", `Project not found: ${id}`, { projectId: id });
        return p;
    }

    async create(input: CreateProjectInput): Promise<Project> {
        // root 去重（避免重复导入同一路径）
        const existed = await this.repo.findByRoot(input.root);
        if (existed) {
            throw new AppError("PROJECT_ALREADY_EXISTS", `Project already exists: ${input.root}`, { projectId: existed.id });
        }

        //  自动扫描 package.json scripts（除非用户传了 scripts）
        let scripts = input.scripts;
        if (!scripts) {
            const meta = await scanProject(input.root);
            scripts = meta.scripts;
        }

        const now = Date.now();
        const p: Project = {
            id: genId("proj"),
            name: input.name,
            root: input.root,
            scripts,
            env: input.env,
            createdAt: now,
            updatedAt: now,
        };

        await this.repo.create(p);
        return p;
    }

    async update(id: string, patch: Partial<Omit<Project, "id" | "createdAt">>): Promise<Project> {
        // 先确保存在
        await this.get(id);

        const now = Date.now();
        const updated = await this.repo.update(id, {
            ...patch,
            updatedAt: now,
        });

        return updated;
    }

    async remove(id: string): Promise<void> {
        // 先确保存在
        await this.get(id);
        await this.repo.remove(id);
    }

    //  可选增强：提供一个 refreshScripts（后面 UI 点“刷新”时用）
    async refreshScripts(id: string): Promise<Project> {
        const p = await this.get(id);
        const meta = await scanProject(p.root);
        return this.update(id, { scripts: meta.scripts } as any);
    }

    /**
     * 扫描指定路径，得到 ProjectMeta
     */
    async scan(root: string): Promise<ProjectMeta> {
        return scanProject(root);
    }
}
