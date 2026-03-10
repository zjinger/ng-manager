import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../env";

function ensureMigrationTable(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL
    );
  `);
}

function getExecutedMigrations(db: Database.Database): Set<string> {
    const rows = db.prepare(`SELECT name FROM _migrations ORDER BY name ASC`).all() as Array<{ name: string }>;
    return new Set(rows.map((r) => r.name));
}

function markMigrationExecuted(db: Database.Database, name: string) {
    db.prepare(`
    INSERT INTO _migrations (name, executed_at)
    VALUES (?, ?)
  `).run(name, new Date().toISOString());
}

function runMigrations() {
    const db = new Database(env.dbPath);
    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => /^\d+.*\.sql$/.test(f))
        .sort();

    try {
        ensureMigrationTable(db);
        const executed = getExecutedMigrations(db);

        for (const file of files) {
            if (executed.has(file)) {
                console.log(`[migrate] skipped: ${file}`);
                continue;
            }

            const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

            const tx = db.transaction(() => {
                db.exec(sql);
                markMigrationExecuted(db, file);
            });

            tx();

            console.log(`[migrate] applied: ${file}`);
        }

        console.log("[migrate] done");
    } finally {
        db.close();
    }
}

runMigrations();