import { loadMigrationEnv } from "../shared/env/env";
import { createSqliteDatabase } from "../shared/db/sqlite";

const MIGRATIONS_TO_RESET = [
  "0041_user_org.sql",
  "0042_system_rbac.sql",
  "0043_approval.sql",
  "0044_reimbursement.sql",
  "0045_project_rbac.sql",
  "0046_system_settings.sql",
  "0047_system_titles.sql",
  "0048_department_titles.sql"
];

function main() {
  const config = loadMigrationEnv();
  const db = createSqliteDatabase(config);

  try {
    db.pragma("foreign_keys = OFF");

    const dropTables = [
      "reimbursement_logs",
      "reimbursement_approval_tasks",
      "reimbursement_attachments",
      "reimbursement_items",
      "reimbursement_claims",
      "approval_template_stages",
      "approval_templates",
      "department_titles",
      "user_system_roles",
      "system_role_permissions",
      "system_permissions",
      "system_roles",
      "user_departments",
      "departments",
      "system_settings",
      "system_titles"
    ];

    for (const tableName of dropTables) {
      db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
    }

    const hasUsersTable = db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users' LIMIT 1"
      )
      .get();

    if (hasUsersTable) {
      db.prepare(`
        CREATE TABLE users_reset_0041_0049 (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          display_name TEXT,
          email TEXT,
          mobile TEXT,
          title_code TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'imported')),
          remark TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();

      db.prepare(`
        INSERT INTO users_reset_0041_0049 (
          id, username, display_name, email, mobile, title_code, status, source, remark, created_at, updated_at
        )
        SELECT
          id, username, display_name, email, mobile, title_code, status, source, remark, created_at, updated_at
        FROM users
      `).run();

      db.prepare("DROP TABLE users").run();
      db.prepare("ALTER TABLE users_reset_0041_0049 RENAME TO users").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name)").run();
    }

    db.prepare(
      `DELETE FROM schema_migrations WHERE name IN (${MIGRATIONS_TO_RESET.map(() => "?").join(", ")})`
    ).run(...MIGRATIONS_TO_RESET);

    db.pragma("foreign_keys = ON");

    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          resetMigrations: MIGRATIONS_TO_RESET
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
