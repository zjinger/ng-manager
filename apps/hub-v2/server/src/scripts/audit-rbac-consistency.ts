import { createSqliteDatabase } from "../shared/db/sqlite";
import { loadMigrationEnv } from "../shared/env/env";

type CountRow = { count: number };

function main() {
  const config = loadMigrationEnv();
  const db = createSqliteDatabase(config);

  try {
    const unboundAccounts = db
      .prepare(
        `
          SELECT id, username
          FROM admin_accounts
          WHERE user_id IS NULL OR TRIM(user_id) = ''
          ORDER BY created_at ASC
        `
      )
      .all() as Array<{ id: string; username: string }>;

    const usersWithoutRoles = db
      .prepare(
        `
          SELECT a.id AS account_id, a.username, a.user_id
          FROM admin_accounts a
          LEFT JOIN user_system_roles ur ON ur.user_id = a.user_id
          WHERE a.user_id IS NOT NULL
          GROUP BY a.id, a.username, a.user_id
          HAVING COUNT(ur.role_id) = 0
          ORDER BY a.username ASC
        `
      )
      .all() as Array<{ account_id: string; username: string; user_id: string }>;

    const mismatchRoleMap = db
      .prepare(
        `
          SELECT
            a.id,
            a.username,
            a.role AS legacy_role,
            GROUP_CONCAT(r.code, ',') AS rbac_roles
          FROM admin_accounts a
          LEFT JOIN user_system_roles ur ON ur.user_id = a.user_id
          LEFT JOIN system_roles r ON r.id = ur.role_id
          GROUP BY a.id, a.username, a.role
          HAVING
            (a.role = 'admin' AND (rbac_roles IS NULL OR INSTR(rbac_roles, 'admin') = 0))
            OR
            (a.role = 'user' AND (rbac_roles IS NULL OR INSTR(rbac_roles, 'member') = 0))
          ORDER BY a.username ASC
        `
      )
      .all() as Array<{ id: string; username: string; legacy_role: string; rbac_roles: string | null }>;

    const totalAccounts = (db.prepare("SELECT COUNT(*) AS count FROM admin_accounts").get() as CountRow).count;
    const totalUsers = (db.prepare("SELECT COUNT(*) AS count FROM users").get() as CountRow).count;

    const report = {
      dbPath: config.dbPath,
      totalAccounts,
      totalUsers,
      issues: {
        unboundAccounts,
        usersWithoutRoles,
        mismatchRoleMap
      },
      ok:
        unboundAccounts.length === 0 &&
        usersWithoutRoles.length === 0 &&
        mismatchRoleMap.length === 0
    };

    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 2);
  } finally {
    db.close();
  }
}

main();
