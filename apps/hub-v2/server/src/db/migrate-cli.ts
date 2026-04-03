import { loadMigrationEnv } from "../shared/env/env";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";

function main() {
  const config = loadMigrationEnv();
  const db = createSqliteDatabase(config);

  try {
    const result = runMigrations(db);
    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
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
