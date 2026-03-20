import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

export class MigrationRunner {
  constructor(
    private readonly db: Database.Database,
    private readonly migrationsDir: string
  ) { }

  run(): { applied: string[] } {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const migrationFiles = fs.existsSync(this.migrationsDir)
      ? fs
        .readdirSync(this.migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort((left, right) => left.localeCompare(right))
      : [];
    const applied = new Set<string>(
      this.db
        .prepare("SELECT name FROM schema_migrations")
        .all()
        .map((row) => String((row as { name: string }).name))
    );

    const insertStmt = this.db.prepare(
      "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)"
    );
    const appliedNow: string[] = [];

    for (const fileName of migrationFiles) {
      if (applied.has(fileName)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(this.migrationsDir, fileName), "utf8");
      const now = new Date().toISOString();

      this.db.transaction(() => {
        if (sql.trim()) {
          this.db.exec(sql);
        }
        insertStmt.run(fileName, now);
      })();

      appliedNow.push(fileName);
    }

    return { applied: appliedNow };
  }
}
