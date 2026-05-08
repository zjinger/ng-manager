import * as path from "node:path";
import { DashboardServiceImpl } from "../../domain/dashboard";
import { createSqliteDatabase } from "@yinuo-ngm/storage";
import { SqliteDashboardRepo, migrateDashboardJsonFilesIfNeeded } from "../../infra/dashboard";

export async function createDashboardDomain(dataDir: string) {
    const db = createSqliteDatabase(path.join(dataDir, "dashboard.db"));
    const repo = new SqliteDashboardRepo(db);

    await migrateDashboardJsonFilesIfNeeded({
        rootDir: dataDir,
        target: repo,
        backup: true,
    });

    return new DashboardServiceImpl(repo);
}
