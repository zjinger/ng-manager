import { type ApiCollectionScope, ApiEnvironmentEntity, ApiHistoryEntity, ApiRequestEntity } from "../domain/models";
import { RequestRepo, EnvRepo, HistoryRepo } from "../domain/services";

export class ApiClient {
    constructor(
        private readonly requestRepo: RequestRepo,
        private readonly envRepo: EnvRepo,
        private readonly historyRepo: HistoryRepo

    ) { }

    // -------- requests --------
    listRequests(scope: ApiCollectionScope, projectId?: string) {
        return this.requestRepo.list(scope, projectId);
    }

    getRequest(id: string, scope: ApiCollectionScope, projectId?: string) {
        return this.requestRepo.get(id, scope, projectId);
    }

    saveRequest(req: ApiRequestEntity, scope: ApiCollectionScope, projectId?: string) {
        return this.requestRepo.save(req, scope, projectId);
    }

    deleteRequest(id: string, scope: ApiCollectionScope, projectId?: string) {
        return this.requestRepo.remove(id, scope, projectId);
    }


    // -------- envs --------
    listEnvs(scope: ApiCollectionScope, projectId?: string) {
        return this.envRepo.list(scope, projectId);
    }
    getEnv(id: string, scope: ApiCollectionScope, projectId?: string) {
        return this.envRepo.get(id, scope, projectId);
    }
    saveEnv(env: ApiEnvironmentEntity, scope: ApiCollectionScope, projectId?: string) {
        return this.envRepo.save(env, scope, projectId);
    }
    deleteEnv(id: string, scope: ApiCollectionScope, projectId?: string) {
        return this.envRepo.remove(id, scope, projectId);
    }

    // -------- history --------
    addHistory(h: ApiHistoryEntity, scope: ApiCollectionScope, projectId?: string) {
        return this.historyRepo.add(h, scope, projectId);
    }
    listHistory(query: { scope: ApiCollectionScope; projectId?: string; limit: number; offset: number }) {
        return this.historyRepo.list(query);
    }
    purgeHistory(query: { scope: ApiCollectionScope; projectId?: string; olderThan?: number; maxCount?: number }) {
        return this.historyRepo.purge(query);
    }
}
