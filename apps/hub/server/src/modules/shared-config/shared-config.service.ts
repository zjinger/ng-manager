import type { ProjectRepo } from "../project/project.repo";
import { AppError } from "../../utils/app-error";
import { SharedConfigRepo } from "./shared-config.repo";
import type {
    CreateSharedConfigInput,
    ListSharedConfigQuery,
    ResolveSharedConfigQuery,
    UpdateSharedConfigInput
} from "./shared-config.types";

export class SharedConfigService {
    constructor(
        private readonly repo: SharedConfigRepo,
        private readonly projectRepo: ProjectRepo
    ) { }

    create(input: CreateSharedConfigInput) {
        const projectId = input.projectId ?? null;
        const scope = input.scope ?? (projectId ? "project" : "global");

        if (scope === "global" && projectId) {
            throw new AppError("INVALID_SCOPE", "global scope cannot bind projectId");
        }

        if (scope === "project" && !projectId) {
            throw new AppError("PROJECT_ID_REQUIRED", "project scope requires projectId");
        }

        if (projectId) {
            const project = this.projectRepo.findById(projectId);
            if (!project) {
                throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`);
            }
        }

        const exists = this.repo.getByProjectAndKey(projectId, input.configKey);
        if (exists) {
            throw new AppError("CONFIG_KEY_EXISTS", `config key already exists: ${input.configKey}`);
        }

        return this.repo.create({
            projectId,
            scope,
            configKey: input.configKey,
            configName: input.configName,
            category: input.category,
            valueType: input.valueType ?? "json",
            configValue: input.configValue,
            description: input.description ?? "",
            isEncrypted: input.isEncrypted ?? false,
            priority: input.priority ?? 0,
            status: input.status ?? "active"
        });
    }

    update(id: string, input: UpdateSharedConfigInput) {
        const exists = this.repo.getById(id);
        if (!exists) {
            throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${id}`);
        }

        return this.repo.update(id, input);
    }

    getById(id: string) {
        const item = this.repo.getById(id);
        if (!item) {
            throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${id}`);
        }
        return item;
    }

    list(query: ListSharedConfigQuery) {
        if (query.projectId) {
            const project = this.projectRepo.findById(query.projectId);
            if (!project) {
                throw new AppError("PROJECT_NOT_FOUND", `project not found: ${query.projectId}`);
            }
        }

        return this.repo.list(query);
    }

    resolve(query: ResolveSharedConfigQuery) {
        if (query.projectId) {
            const project = this.projectRepo.findById(query.projectId);
            if (!project) {
                throw new AppError("PROJECT_NOT_FOUND", `project not found: ${query.projectId}`);
            }
        }

        return this.repo.resolve(query.projectId, query.category);
    }

    remove(id: string) {
        const exists = this.repo.getById(id);
        if (!exists) {
            throw new AppError("SHARED_CONFIG_NOT_FOUND", `shared config not found: ${id}`);
        }

        this.repo.remove(id);
    }
}