import * as path from "path";
import {
    ApiClient,
    JsonEnvRepo,
    JsonHistoryRepo,
    JsonRequestRepo,
    NodeHttpClient,
    VariableResolver,
    ApiSendService,
    JsonCollectionRepo
} from "@yinuo-ngm/api";
import type { CoreDomainHandle } from "./types";

const API_SUBDIR = "api";

export function createApiClientDomain(opts: {
    dataDir: string;
}): CoreDomainHandle<ApiClient> {
    const rootDir = path.join(opts.dataDir, API_SUBDIR);

    const repo = new JsonRequestRepo({ rootDir });
    const envRepo = new JsonEnvRepo({ rootDir });
    const historyRepo = new JsonHistoryRepo({ rootDir });
    const collectionRepo = new JsonCollectionRepo({ rootDir });

    const http = new NodeHttpClient();
    const resolver = new VariableResolver();
    const sendService = new ApiSendService(repo, envRepo, historyRepo, http, resolver);
    const apiClient = new ApiClient(repo, envRepo, historyRepo, collectionRepo, sendService);

    return { service: apiClient };
}