import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";
import { loadMigrationEnv } from "../shared/env/env";
import { assertNonProductionScript } from "./production-guard";

const MIGRATION_NAME = "0058_project_feature_progress.sql";
const TABLES_TO_DROP = [
  "project_feature_point_owners",
  "project_feature_progress_overrides",
  "project_feature_points",
  "project_feature_point_groups",
  "project_feature_progress_settings"
];

function main() {
  const config = loadMigrationEnv();
  assertNonProductionScript("reset-project-feature-progress-0058");
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
