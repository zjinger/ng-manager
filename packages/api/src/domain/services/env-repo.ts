import { ApiScope } from "../models";
import type { ApiEnvironmentEntity } from "../models/api-environment";

export interface EnvRepo {
    list(scope: ApiScope, projectId?: string): Promise<ApiEnvironmentEntity[]>;
    get(id: string, scope: ApiScope, projectId?: string): Promise<ApiEnvironmentEntity | null>;
    save(env: ApiEnvironmentEntity, scope: ApiScope, projectId?: string): Promise<void>;
    remove(id: string, scope: ApiScope, projectId?: string): Promise<void>;
}
