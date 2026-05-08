import * as path from "path";
import {
    ApiClient,
    SqliteCollectionRepo,
    SqliteEnvRepo,
    SqliteHistoryRepo,
    SqliteRequestRepo,
    NodeHttpClient,
    VariableResolver,
    ApiSendService,
} from "@yinuo-ngm/api";
import {
    createSqliteDatabase,
} from "@yinuo-ngm/storage";
import {
    migrateJsonlHistoryFilesIfNeeded,
    migrateScopedJsonKvFilesIfNeeded,
} from "@yinuo-ngm/api";
import type { CoreDomainHandle } from "./types";

const API_SUBDIR = "api";

export async function createApiClientDomain(opts: {
    dataDir: string;
}): Promise<CoreDomainHandle<ApiClient>> {
    const rootDir = path.join(opts.dataDir, API_SUBDIR);
    const db = createSqliteDatabase(path.join(rootDir, "api.db"));

    const repo = new SqliteRequestRepo(db);
    const envRepo = new SqliteEnvRepo(db);
    const historyRepo = new SqliteHistoryRepo(db);
    const collectionRepo = new SqliteCollectionRepo(db);

    await migrateScopedJsonKvFilesIfNeeded({
        rootDir,
        fileName: "requests.kv.json",
        target: repo,
        backup: true,
    });
    await migrateScopedJsonKvFilesIfNeeded({
        rootDir,
        fileName: "envs.kv.json",
        target: envRepo,
        backup: true,
    });
    await migrateScopedJsonKvFilesIfNeeded({
        rootDir,
        fileName: "collections.kv.json",
        target: collectionRepo,
        backup: true,
    });
    await migrateJsonlHistoryFilesIfNeeded({
        rootDir,
        fileName: "history.jsonl",
        target: historyRepo,
        backup: true,
    });

    const http = new NodeHttpClient();
    const resolver = new VariableResolver();
    const sendService = new ApiSendService(repo, envRepo, historyRepo, http, resolver);
    const apiClient = new ApiClient(repo, envRepo, historyRepo, collectionRepo, sendService);

    return { service: apiClient };
}
