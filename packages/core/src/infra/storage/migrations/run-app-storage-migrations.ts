import path from "node:path";
import type { Project } from "@yinuo-ngm/project";
import { migrateProjectsIfNeeded } from "@yinuo-ngm/project";
import {
    migrateJsonKvFileIfNeeded,
    type SqliteDatabase,
    SqliteJsonKvRepo,
} from "@yinuo-ngm/storage";
import {
    migrateJsonlHistoryFilesIfNeeded,
    migrateScopedJsonKvFilesIfNeeded,
    SqliteCollectionRepo,
    SqliteEnvRepo,
    SqliteHistoryRepo,
    SqliteRequestRepo,
} from "@yinuo-ngm/api";
import { migrateLegacySpriteConfigsIfNeeded } from "@yinuo-ngm/sprite";
import { migrateLegacySvnRuntimeIfNeeded } from "@yinuo-ngm/svn";
import { SqliteDashboardRepo, migrateDashboardJsonFilesIfNeeded } from "../../dashboard";
import type { LatestCacheSnapshot } from "@yinuo-ngm/deps";

const API_SUBDIR = "api";

export async function runAppStorageMigrations(opts: {
    dataDir: string;
    cacheDir: string;
    db: SqliteDatabase;
}): Promise<void> {
    const rootDir = path.join(opts.dataDir, API_SUBDIR);
    const db = opts.db;

    const projectKv = new SqliteJsonKvRepo<Project>(db, { tableName: "projects" });
    await migrateJsonKvFileIfNeeded({
        sourceFile: path.join(opts.dataDir, "projects.kv.json"),
        target: projectKv,
        backup: true,
    });
    await migrateProjectsIfNeeded({
        dbDir: opts.dataDir,
        projectKv,
        legacyFileName: "projects.json",
        backup: true,
    });

    const dashboardRepo = new SqliteDashboardRepo(db);
    await migrateDashboardJsonFilesIfNeeded({
        rootDir: opts.dataDir,
        target: dashboardRepo,
        backup: true,
    });

    const requestRepo = new SqliteRequestRepo(db);
    const envRepo = new SqliteEnvRepo(db);
    const historyRepo = new SqliteHistoryRepo(db);
    const collectionRepo = new SqliteCollectionRepo(db);

    await migrateScopedJsonKvFilesIfNeeded({
        rootDir,
        fileName: "requests.kv.json",
        target: requestRepo,
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

    migrateLegacySpriteConfigsIfNeeded(db, opts.dataDir);
    migrateLegacySvnRuntimeIfNeeded(db, path.join(opts.dataDir, "runtime", "svn.runtime.json"));

    const latestRepo = new SqliteJsonKvRepo<LatestCacheSnapshot>(db, {
        tableName: "deps_latest_cache_snapshots",
    });
    await migrateJsonKvFileIfNeeded({
        sourceFile: path.join(opts.cacheDir, "npm-latest.kv.json"),
        target: latestRepo,
        backup: true,
    });
}
