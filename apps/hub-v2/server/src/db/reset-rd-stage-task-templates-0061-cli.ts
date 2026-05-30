import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";
import { loadMigrationEnv } from "../shared/env/env";
import { assertNonProductionScript } from "./production-guard";

const MIGRATION_NAME = "0061_rd_stage_task_templates.sql";
const TABLES_TO_DROP = ["rd_stage_task_templates"];

function main() {
  const config = loadMigrationEnv();
  assertNonProductionScript("reset-rd-stage-task-templates-0061");
  const db = createSqliteDatabase(config);

  try {
    db.pragma("foreign_keys = OFF");

    db.transaction(() => {
      for (const tableName of TABLES_TO_DROP) {
        db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
      }
      db.prepare("DELETE FROM schema_migrations WHERE name = ?").run(MIGRATION_NAME);
    })();

    db.pragma("foreign_keys = ON");

    const result = runMigrations(db);

    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          resetMigration: MIGRATION_NAME,
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
