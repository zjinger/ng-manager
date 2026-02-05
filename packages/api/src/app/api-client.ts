import { type ApiScope, ApiEnvironmentEntity, ApiHistoryEntity, ApiRequestEntity, SendDto, SendResult } from "../domain/models";
import { RequestRepo, EnvRepo, HistoryRepo, ApiSendService, } from "../domain/services";

export class ApiClient {
    constructor(
        private readonly requestRepo: RequestRepo,
        private readonly envRepo: EnvRepo,
        private readonly historyRepo: HistoryRepo,
        private readonly sendService: ApiSendService

    ) { }

    // -------- requests --------
    listRequests(scope: ApiScope, projectId?: string) {
        return this.requestRepo.list(scope, projectId);
    }

    getRequest(id: string, scope: ApiScope, projectId?: string) {
        return this.requestRepo.get(id, scope, projectId);
    }

    saveRequest(req: ApiRequestEntity, scope: ApiScope, projectId?: string) {
        return this.requestRepo.save(req, scope, projectId);
    }

    deleteRequest(id: string, scope: ApiScope, projectId?: string) {
        return this.requestRepo.remove(id, scope, projectId);
    }


    // -------- envs --------
    listEnvs(scope: ApiScope, projectId?: string) {
        return this.envRepo.list(scope, projectId);
    }
    getEnv(id: string, scope: ApiScope, projectId?: string) {
        return this.envRepo.get(id, scope, projectId);
    }
    saveEnv(env: ApiEnvironmentEntity, scope: ApiScope, projectId?: string) {
        return this.envRepo.save(env, scope, projectId);
    }
    deleteEnv(id: string, scope: ApiScope, projectId?: string) {
        return this.envRepo.remove(id, scope, projectId);
    }

    // -------- history --------
    addHistory(h: ApiHistoryEntity, scope: ApiScope, projectId?: string) {
        return this.historyRepo.add(h, scope, projectId);
    }
    listHistory(query: { scope: ApiScope; projectId?: string; limit: number; offset: number }) {
        return this.historyRepo.list(query);
    }
    purgeHistory(query: { scope: ApiScope; projectId?: string; olderThan?: number; maxCount?: number }) {
        return this.historyRepo.purge(query);
    }

    // -------- send --------
    send(dto: SendDto): Promise<SendResult> {
        return this.sendService.send(dto);
    }
}
