import {
    initApiSqliteSchema,
    migrateJsonlHistoryFilesIfNeeded,
    migrateScopedJsonKvFilesIfNeeded,
    SqliteCollectionRepo,
    SqliteEnvRepo,
    SqliteHistoryRepo,
    SqliteRequestRepo,
} from "@yinuo-ngm/api";
import type { LatestCacheSnapshot } from "@yinuo-ngm/deps";
import { migrateNginxBindingJsonIfNeeded } from "@yinuo-ngm/nginx";
import type { Project } from "@yinuo-ngm/project";
import { migrateLegacySpriteConfigsIfNeeded } from "@yinuo-ngm/sprite";
import {
    migrateJsonKvFileIfNeeded,
    type SqliteDatabase,
    SqliteJsonKvRepo,
} from "@yinuo-ngm/storage";
import { initSvnSchema, migrateLegacySvnRuntimeIfNeeded } from "@yinuo-ngm/svn";
import path from "node:path";
import {
    initDashboardSchema,
    migrateDashboardJsonFilesIfNeeded,
    SqliteDashboardRepo,
} from "../../dashboard";
import type { AppMigration } from "./app-migration-runner";
import { runAppMigrationRunner } from "./app-migration-runner";

const API_SUBDIR = "api";

export async function runAppStorageMigrations(opts: {
    dataDir: string;
    cacheDir: string;
    db: SqliteDatabase;
}): Promise<void> {
    const migrations: AppMigration[] = [
        {
            version: "20260511-001",
            name: "project-json-to-sqlite",
            up: async (ctx) => {
                const projectKv = new SqliteJsonKvRepo<Project>(ctx.db, { tableName: "projects" });
                await migrateJsonKvFileIfNeeded({
                    sourceFile: path.join(ctx.dataDir, "projects.kv.json"),
                    target: projectKv,
                    backup: true,
                });
                // await migrateProjectsIfNeeded({
                //     dbDir: ctx.dataDir,
                //     projectKv,
                //     legacyFileName: "projects.json",
                //     backup: true,
                // });
            },
        },
        {
            version: "20260511-002",
            name: "dashboard-json-to-sqlite",
            up: async (ctx) => {
                initDashboardSchema(ctx.db);
                const dashboardRepo = new SqliteDashboardRepo(ctx.db);
                await migrateDashboardJsonFilesIfNeeded({
                    rootDir: ctx.dataDir,
                    target: dashboardRepo,
                    backup: true,
                });
            },
        },
        {
            version: "20260511-003",
            name: "api-json-to-sqlite",
            up: async (ctx) => {
                const rootDir = path.join(ctx.dataDir, API_SUBDIR);
                initApiSqliteSchema(ctx.db);
                const requestRepo = new SqliteRequestRepo(ctx.db);
                const envRepo = new SqliteEnvRepo(ctx.db);
                const historyRepo = new SqliteHistoryRepo(ctx.db);
                const collectionRepo = new SqliteCollectionRepo(ctx.db);

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
            },
        },
        {
            version: "20260511-004",
            name: "sprite-json-to-sqlite",
            up: async (ctx) => {
                migrateLegacySpriteConfigsIfNeeded(ctx.db, ctx.dataDir);
            },
        },
        {
            version: "20260511-005",
            name: "svn-json-to-sqlite",
            up: async (ctx) => {
                initSvnSchema(ctx.db);
                migrateLegacySvnRuntimeIfNeeded(ctx.db, path.join(ctx.dataDir, "runtime", "svn.runtime.json"));
            },
        },
        {
            version: "20260511-006",
            name: "deps-json-to-sqlite",
            up: async (ctx) => {
                const latestRepo = new SqliteJsonKvRepo<LatestCacheSnapshot>(ctx.db, {
                    tableName: "deps_latest_cache_snapshots",
                });
                await migrateJsonKvFileIfNeeded({
                    sourceFile: path.join(ctx.cacheDir, "npm-latest.kv.json"),
                    target: latestRepo,
                    backup: true,
                });
            },
        },
        {
            version: "20260511-007",
            name: "nginx-binding-json-to-sqlite",
            up: async (ctx) => {
                migrateNginxBindingJsonIfNeeded(ctx.db, ctx.dataDir);
            },
        },
        {
            version: "20260513-001",
            name: "dashboard-json-to-sqlite-backfill",
            up: async (ctx) => {
                initDashboardSchema(ctx.db);
                const dashboardRepo = new SqliteDashboardRepo(ctx.db);
                await migrateDashboardJsonFilesIfNeeded({
                    rootDir: ctx.dataDir,
                    target: dashboardRepo,
                    backup: true,
                });
            },
        },
        {
            version: "20260513-002",
            name: "api-json-to-sqlite-backfill",
            up: async (ctx) => {
                const rootDir = path.join(ctx.dataDir, API_SUBDIR);
                initApiSqliteSchema(ctx.db);
                const requestRepo = new SqliteRequestRepo(ctx.db);
                const envRepo = new SqliteEnvRepo(ctx.db);
                const historyRepo = new SqliteHistoryRepo(ctx.db);
                const collectionRepo = new SqliteCollectionRepo(ctx.db);

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
            },
        },
    ];

    await runAppMigrationRunner({
        ctx: {
            dataDir: opts.dataDir,
            cacheDir: opts.cacheDir,
            db: opts.db,
        },
        migrations,
    });
}
