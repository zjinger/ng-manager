import type { ApiEnvironmentEntity } from "../models/api-environment";

export interface EnvRepo {
    list(scope: "global" | "project", projectId?: string): Promise<ApiEnvironmentEntity[]>;
    get(id: string, scope: "global" | "project", projectId?: string): Promise<ApiEnvironmentEntity | null>;
    save(env: ApiEnvironmentEntity, scope: "global" | "project", projectId?: string): Promise<void>;
    remove(id: string, scope: "global" | "project", projectId?: string): Promise<void>;
}
