import { DashboardServiceImpl } from "../../domain/dashboard";
import type { SqliteDatabase } from "@yinuo-ngm/storage";
import {
    initDashboardSchema,
    SqliteDashboardRepo,
    migrateDashboardJsonFilesIfNeeded,
} from "../../infra/dashboard";

export async function createDashboardDomain(opts: {
    dataDir: string;
    db: SqliteDatabase;
    migrateIfNeeded?: boolean;
}) {
    const dataDir = opts.dataDir;
    const db = opts.db;
    initDashboardSchema(db);
    const repo = new SqliteDashboardRepo(db);

    if (opts.migrateIfNeeded ?? true) {
        await migrateDashboardJsonFilesIfNeeded({
            rootDir: dataDir,
            target: repo,
            backup: true,
        });
    }

    return new DashboardServiceImpl(repo);
}
