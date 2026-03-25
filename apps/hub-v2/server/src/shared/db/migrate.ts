import path from "node:path";
import fs from "node:fs";
import type Database from "better-sqlite3";
import { MigrationRunner } from "./migration-runner";

function resolveMigrationsDir(cwd: string) {
  const candidates = [
    path.join(cwd, "src", "db", "migrations"),
    path.join(cwd, "db", "migrations"),
    path.join(cwd, "dist", "db", "migrations"),
    path.resolve(__dirname, "..", "..", "db", "migrations"),
    path.resolve(__dirname, "..", "..", "..", "src", "db", "migrations")
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  throw new Error(
    `[db:migrate] migrations directory not found. checked: ${candidates.join(", ")}`
  );
}

export function runMigrations(db: Database.Database, cwd = process.cwd()) {
  const migrationsDir = resolveMigrationsDir(cwd);
  const runner = new MigrationRunner(db, migrationsDir);
  return runner.run();
}
