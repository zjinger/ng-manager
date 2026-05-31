import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";
import { loadMigrationEnv } from "../shared/env/env";
import { assertNonProductionScript } from "./production-guard";

const MIGRATION_NAME = "0063_personal_todos.sql";
const TABLES_TO_DROP = [
  "personal_todo_seed_state",
  "personal_todo_tag_links",
  "personal_todos",
  "personal_todo_folders",
  "personal_todo_tags"
];

function main() {
  const config = loadMigrationEnv();
  assertNonProductionScript("reset-personal-todos-0063");
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
