import { ApiScope } from "../models";
import type { ApiRequestEntity } from "../models/api-request";

export interface RequestRepo {
    list(scope: ApiScope, projectId?: string): Promise<ApiRequestEntity[]>;
    get(id: string, scope: ApiScope, projectId?: string): Promise<ApiRequestEntity | null>;
    save(req: ApiRequestEntity, scope: ApiScope, projectId?: string): Promise<void>;
    remove(id: string, scope: ApiScope, projectId?: string): Promise<void>;
}
