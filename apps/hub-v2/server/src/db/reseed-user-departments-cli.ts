import { loadMigrationEnv } from "../shared/env/env";
import { createSqliteDatabase } from "../shared/db/sqlite";

type Mode = "append" | "replace";

type UserDepartmentSeed = {
  username: string;
  departmentCode: string;
  roleCode: string | null;
};

const DEFAULT_MODE: Mode = "append";

const USER_DEPARTMENT_SEEDS: UserDepartmentSeed[] = [
  { username: "pm.hub", departmentCode: "planning_mgmt", roleCode: "member" },
  { username: "dev.hub", departmentCode: "frontend_rd_1", roleCode: "member" },
  { username: "dev.runtime", departmentCode: "backend_rd", roleCode: "member" },
  { username: "qa.hub", departmentCode: "planning_mgmt", roleCode: "member" },
  { username: "ux.hub", departmentCode: "planning_mgmt", roleCode: "member" },
  { username: "ops.hub", departmentCode: "backend_rd", roleCode: "member" },
  { username: "finance", departmentCode: "finance_legal_tax", roleCode: "member" },
  { username: "bizdev", departmentCode: "business_marketing", roleCode: "member" }
];

function parseMode(argv: string[]): Mode {
  const modeArg = argv.find((item) => item.startsWith("--mode="));
  if (!modeArg) {
    return DEFAULT_MODE;
  }
  const raw = modeArg.split("=")[1]?.trim().toLowerCase();
  if (raw === "append" || raw === "replace") {
    return raw;
  }
  throw new Error(`invalid --mode value: ${raw ?? ""}, expected append|replace`);
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  const config = loadMigrationEnv();
  const db = createSqliteDatabase(config);

  const findUserId = db.prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
  const findDepartmentId = db.prepare("SELECT id FROM departments WHERE code = ? LIMIT 1");
  const findExisting = db.prepare("SELECT id FROM user_departments WHERE user_id = ? LIMIT 1");
  const deleteExisting = db.prepare("DELETE FROM user_departments WHERE user_id = ?");
  const insertRel = db.prepare(`
    INSERT OR IGNORE INTO user_departments (id, user_id, department_id, role_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  let inserted = 0;
  let replaced = 0;
  let skippedExists = 0;
  const missingUsers: string[] = [];
  const missingDepartments: string[] = [];

  try {
    db.pragma("foreign_keys = ON");
    db.exec("BEGIN");

    for (const item of USER_DEPARTMENT_SEEDS) {
      const userRow = findUserId.get(item.username) as { id: string } | undefined;
      if (!userRow) {
        missingUsers.push(item.username);
        continue;
      }
      const departmentRow = findDepartmentId.get(item.departmentCode) as { id: string } | undefined;
      if (!departmentRow) {
        missingDepartments.push(item.departmentCode);
        continue;
      }

      const existing = findExisting.get(userRow.id) as { id: string } | undefined;
      if (mode === "append" && existing) {
        skippedExists += 1;
        continue;
      }
      if (mode === "replace" && existing) {
        deleteExisting.run(userRow.id);
        replaced += 1;
      }

      insertRel.run(`ud_seed_${userRow.id}`, userRow.id, departmentRow.id, item.roleCode);
      inserted += 1;
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }

  console.log(
    JSON.stringify(
      {
        dbPath: config.dbPath,
        mode,
        totalSeeds: USER_DEPARTMENT_SEEDS.length,
        inserted,
        replaced,
        skippedExists,
        missingUsers,
        missingDepartments: [...new Set(missingDepartments)]
      },
      null,
      2
    )
  );
}

main();

