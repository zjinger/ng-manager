import path from "node:path";
import type Database from "better-sqlite3";
import { MigrationRunner } from "./migration-runner";

export function runMigrations(db: Database.Database, cwd = process.cwd()) {
  const migrationsDir = path.join(cwd, "src", "db", "migrations");
  const runner = new MigrationRunner(db, migrationsDir);
  return runner.run();
}
