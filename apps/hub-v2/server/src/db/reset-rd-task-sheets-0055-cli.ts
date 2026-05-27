import { createSqliteDatabase } from "../shared/db/sqlite";
import { loadMigrationEnv } from "../shared/env/env";

const MIGRATION_NAME = "0055_rd_task_sheets.sql";
const PERMISSION_CODES = [
  "task_sheet.submit",
  "task_sheet.view.self",
  "task_sheet.review",
  "task_sheet.receive",
  "task_sheet.assign",
  "task_sheet.deliver",
  "task_sheet.accept",
  "task_sheet.manage"
];

function main() {
  const config = loadMigrationEnv();
  const db = createSqliteDatabase(config);

  try {
    db.pragma("foreign_keys = OFF");

    db.transaction(() => {
      db.prepare("DROP TABLE IF EXISTS rd_task_sheet_default_routes").run();
      db.prepare("DROP TABLE IF EXISTS rd_task_sheet_logs").run();
      db.prepare("DROP TABLE IF EXISTS rd_task_sheet_links").run();
      db.prepare("DROP TABLE IF EXISTS rd_task_sheet_attachments").run();
      db.prepare("DROP TABLE IF EXISTS rd_task_sheets").run();

      db.prepare(
        `DELETE FROM system_role_permissions
         WHERE permission_id IN (
           SELECT id FROM system_permissions WHERE code IN (${PERMISSION_CODES.map(() => "?").join(", ")})
         )`
      ).run(...PERMISSION_CODES);

      db.prepare(
        `DELETE FROM system_permissions WHERE code IN (${PERMISSION_CODES.map(() => "?").join(", ")})`
      ).run(...PERMISSION_CODES);

      db.prepare("DELETE FROM schema_migrations WHERE name = ?").run(MIGRATION_NAME);
    })();

    db.pragma("foreign_keys = ON");

    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          resetMigration: MIGRATION_NAME,
          droppedTables: [
            "rd_task_sheet_default_routes",
            "rd_task_sheet_logs",
            "rd_task_sheet_links",
            "rd_task_sheet_attachments",
            "rd_task_sheets"
          ],
          removedPermissions: PERMISSION_CODES
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
