import type { SqliteDatabase } from "@yinuo-ngm/storage";

export interface AppMigrationContext {
    dataDir: string;
    cacheDir: string;
    db: SqliteDatabase;
}

export interface AppMigration {
    version: string;
    name: string;
    up: (ctx: AppMigrationContext) => Promise<void> | void;
}

export interface AppMigrationRunResult {
    applied: string[];
}

function ensureMigrationTable(db: SqliteDatabase) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS app_migrations (
            version TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `);
}

function assertUniqueVersions(migrations: AppMigration[]) {
    const seen = new Set<string>();
    for (const migration of migrations) {
        if (seen.has(migration.version)) {
            throw new Error(`Duplicate app migration version: ${migration.version}`);
        }
        seen.add(migration.version);
    }
}

export async function runAppMigrationRunner(opts: {
    ctx: AppMigrationContext;
    migrations: AppMigration[];
}): Promise<AppMigrationRunResult> {
    const db = opts.ctx.db;
    ensureMigrationTable(db);
    assertUniqueVersions(opts.migrations);

    const appliedRows = db
        .prepare(`SELECT version FROM app_migrations`)
        .all() as Array<{ version: string }>;
    const appliedVersions = new Set(appliedRows.map((row) => String(row.version)));

    const migrations = [...opts.migrations].sort((a, b) => a.version.localeCompare(b.version));
    const insertStmt = db.prepare(`
        INSERT INTO app_migrations (version, name, applied_at)
        VALUES (?, ?, ?)
    `);

    const applied: string[] = [];
    for (const migration of migrations) {
        if (appliedVersions.has(migration.version)) continue;

        await migration.up(opts.ctx);
        insertStmt.run(migration.version, migration.name, new Date().toISOString());
        applied.push(migration.version);
    }

    return { applied };
}
