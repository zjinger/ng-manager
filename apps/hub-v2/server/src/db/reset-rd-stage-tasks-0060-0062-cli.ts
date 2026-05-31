import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";
import { loadMigrationEnv } from "../shared/env/env";
import { assertNonProductionScript } from "./production-guard";

const MIGRATION_NAMES = [
  "0066_rd_stage_task_baseline_backfill.sql",
  "0062_rd_stage_task_owners.sql",
  "0060_rd_stage_tasks.sql"
];
const TABLES_TO_DROP = ["rd_stage_task_owners", "rd_stage_tasks"];

function main() {
  const config = loadMigrationEnv();
  assertNonProductionScript("reset-rd-stage-tasks-0060-0062");
  const db = createSqliteDatabase(config);

  try {
    db.pragma("foreign_keys = OFF");

    db.transaction(() => {
      for (const tableName of TABLES_TO_DROP) {
        db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
      }
      for (const migrationName of MIGRATION_NAMES) {
        db.prepare("DELETE FROM schema_migrations WHERE name = ?").run(migrationName);
      }
    })();

    db.pragma("foreign_keys = ON");

    const result = runMigrations(db);

    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          resetMigrations: MIGRATION_NAMES,
          droppedTables: TABLES_TO_DROP,
          applied: result.applied
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

main();
