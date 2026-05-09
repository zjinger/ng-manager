import { DashboardServiceImpl } from "../../domain/dashboard";
import type { SqliteDatabase } from "@yinuo-ngm/storage";
import { SqliteDashboardRepo, migrateDashboardJsonFilesIfNeeded } from "../../infra/dashboard";

export async function createDashboardDomain(opts: {
    dataDir: string;
    db: SqliteDatabase;
}) {
    const dataDir = opts.dataDir;
    const db = opts.db;
    const repo = new SqliteDashboardRepo(db);

    await migrateDashboardJsonFilesIfNeeded({
        rootDir: dataDir,
        target: repo,
        backup: true,
    });

    return new DashboardServiceImpl(repo);
}
