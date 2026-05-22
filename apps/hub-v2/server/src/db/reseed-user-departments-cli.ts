import { loadMigrationEnv } from "../shared/env/env";
import { createSqliteDatabase } from "../shared/db/sqlite";

type Mode = "append" | "replace";

type UserDepartmentSeed = {
  username: string;
  departmentCode: string;
  roleCode: string | null;
  organizationTitleCode: string | null;
  defaultProjectTitleCode: string | null;
};

type DepartmentManagerSeed = {
  departmentCode: string;
  managerUsername: string;
};

type UserManagerSeed = {
  username: string;
  managerUsername: string;
};

const DEFAULT_MODE: Mode = "append";

const USER_DEPARTMENT_SEEDS: UserDepartmentSeed[] = [
  { username: "pmmanager", departmentCode: "planning_mgmt", roleCode: "member", organizationTitleCode: "supervisor", defaultProjectTitleCode: "product" },
  { username: "pm.hub", departmentCode: "planning_mgmt", roleCode: "member", organizationTitleCode: "product_manager", defaultProjectTitleCode: "product" },
  { username: "dev.hub", departmentCode: "frontend_rd_1", roleCode: "member", organizationTitleCode: "frontend_engineer", defaultProjectTitleCode: "frontend_dev" },
  { username: "dev.runtime", departmentCode: "backend_rd", roleCode: "member", organizationTitleCode: "backend_engineer", defaultProjectTitleCode: "backend_dev" },
  { username: "qa.hub", departmentCode: "planning_mgmt", roleCode: "member", organizationTitleCode: "product_assistant", defaultProjectTitleCode: "qa" },
  { username: "ux.hub", departmentCode: "planning_mgmt", roleCode: "member", organizationTitleCode: "ui_designer", defaultProjectTitleCode: "ui" },
  { username: "ops.hub", departmentCode: "backend_rd", roleCode: "member", organizationTitleCode: "backend_engineer", defaultProjectTitleCode: "ops" },
  { username: "finance", departmentCode: "finance_legal_tax", roleCode: "finance", organizationTitleCode: "accountant", defaultProjectTitleCode: "member" },
  { username: "bizdev", departmentCode: "business_marketing", roleCode: "expense_manager", organizationTitleCode: "business", defaultProjectTitleCode: "member" }
];

const DEPARTMENT_MANAGER_SEEDS: DepartmentManagerSeed[] = [
  { departmentCode: "planning_mgmt", managerUsername: "pmmanager" }
];

const USER_MANAGER_SEEDS: UserManagerSeed[] = [
  { username: "pm.hub", managerUsername: "pmmanager" },
  { username: "dev.hub", managerUsername: "pmmanager" },
  { username: "qa.hub", managerUsername: "pmmanager" }
];

const SEED_MANAGED_SYSTEM_ROLE_CODES = [
  "member",
  "expense_manager",
  "finance"
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
  const findOrganizationTitle = db.prepare("SELECT code FROM organization_titles WHERE code = ? AND status = 'active' LIMIT 1");
  const findProjectTitle = db.prepare("SELECT code FROM project_titles WHERE code = ? AND status = 'active' LIMIT 1");
  const findExisting = db.prepare("SELECT id FROM user_departments WHERE user_id = ? LIMIT 1");
  const findSystemRoleId = db.prepare("SELECT id FROM system_roles WHERE code = ? AND status = 'active' LIMIT 1");
  const deleteExisting = db.prepare("DELETE FROM user_departments WHERE user_id = ?");
  const insertRel = db.prepare(`
    INSERT OR IGNORE INTO user_departments (id, user_id, department_id, role_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  const insertSystemRole = db.prepare(`
    INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  const deleteSeedManagedRoles = db.prepare(`
    DELETE FROM user_system_roles
     WHERE user_id = ?
       AND role_id IN (
         SELECT id FROM system_roles
          WHERE code IN (${SEED_MANAGED_SYSTEM_ROLE_CODES.map(() => "?").join(", ")})
       )
  `);
  const updateDepartmentManager = db.prepare(`
    UPDATE departments
       SET manager_user_id = ?, updated_at = datetime('now')
     WHERE code = ?
  `);
  const updateUserManager = db.prepare(`
    UPDATE users
       SET manager_user_id = ?, updated_at = datetime('now')
     WHERE username = ?
  `);
  const updateUserOrganizationTitle = db.prepare(`
    UPDATE users
       SET organization_title_code = ?, updated_at = datetime('now')
     WHERE id = ?
  `);
  const updateUserDefaultProjectTitle = db.prepare(`
    UPDATE users
       SET default_project_title_code = ?, updated_at = datetime('now')
     WHERE id = ?
  `);

  let inserted = 0;
  let replaced = 0;
  let roleBindingsInserted = 0;
  let roleBindingsRemoved = 0;
  let departmentManagersUpdated = 0;
  let userManagersUpdated = 0;
  let organizationTitlesUpdated = 0;
  let defaultProjectTitlesUpdated = 0;
  let skippedExists = 0;
  const missingUsers: string[] = [];
  const missingDepartments: string[] = [];
  const missingSystemRoles: string[] = [];
  const missingManagerUsers: string[] = [];
  const missingManagerDepartments: string[] = [];
  const missingManagedUsers: string[] = [];
  const missingOrganizationTitles: string[] = [];
  const missingProjectTitles: string[] = [];

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
      if (item.organizationTitleCode) {
        const organizationTitleRow = findOrganizationTitle.get(item.organizationTitleCode) as { code: string } | undefined;
        if (!organizationTitleRow) {
          missingOrganizationTitles.push(item.organizationTitleCode);
        } else {
          const result = updateUserOrganizationTitle.run(item.organizationTitleCode, userRow.id);
          organizationTitlesUpdated += Number(result.changes ?? 0);
        }
      }
      if (item.defaultProjectTitleCode) {
        const projectTitleRow = findProjectTitle.get(item.defaultProjectTitleCode) as { code: string } | undefined;
        if (!projectTitleRow) {
          missingProjectTitles.push(item.defaultProjectTitleCode);
        } else {
          const result = updateUserDefaultProjectTitle.run(item.defaultProjectTitleCode, userRow.id);
          defaultProjectTitlesUpdated += Number(result.changes ?? 0);
        }
      }

      const existing = findExisting.get(userRow.id) as { id: string } | undefined;
      if (mode === "append" && existing) {
        skippedExists += 1;
      } else if (mode === "replace" && existing) {
        deleteExisting.run(userRow.id);
        replaced += 1;
        insertRel.run(`ud_seed_${userRow.id}`, userRow.id, departmentRow.id, item.roleCode);
        inserted += 1;
      } else {
        insertRel.run(`ud_seed_${userRow.id}`, userRow.id, departmentRow.id, item.roleCode);
        inserted += 1;
      }

      const desiredRoleCodes = parseRoleCodes(item.roleCode);
      const cleanupResult = deleteSeedManagedRoles.run(userRow.id, ...SEED_MANAGED_SYSTEM_ROLE_CODES);
      roleBindingsRemoved += Number(cleanupResult.changes ?? 0);

      for (const roleCode of desiredRoleCodes) {
        const roleRow = findSystemRoleId.get(roleCode) as { id: string } | undefined;
        if (!roleRow) {
          missingSystemRoles.push(roleCode);
          continue;
        }
        const result = insertSystemRole.run(`usr_seed_${userRow.id}_${roleCode}`, userRow.id, roleRow.id);
        roleBindingsInserted += Number(result.changes ?? 0);
      }
    }

    for (const item of DEPARTMENT_MANAGER_SEEDS) {
      const managerRow = findUserId.get(item.managerUsername) as { id: string } | undefined;
      if (!managerRow) {
        missingManagerUsers.push(item.managerUsername);
        continue;
      }
      const departmentRow = findDepartmentId.get(item.departmentCode) as { id: string } | undefined;
      if (!departmentRow) {
        missingManagerDepartments.push(item.departmentCode);
        continue;
      }
      const result = updateDepartmentManager.run(managerRow.id, item.departmentCode);
      departmentManagersUpdated += Number(result.changes ?? 0);
    }

    for (const item of USER_MANAGER_SEEDS) {
      const managerRow = findUserId.get(item.managerUsername) as { id: string } | undefined;
      if (!managerRow) {
        missingManagerUsers.push(item.managerUsername);
        continue;
      }
      const userRow = findUserId.get(item.username) as { id: string } | undefined;
      if (!userRow) {
        missingManagedUsers.push(item.username);
        continue;
      }
      const result = updateUserManager.run(managerRow.id, item.username);
      userManagersUpdated += Number(result.changes ?? 0);
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
        roleBindingsInserted,
        roleBindingsRemoved,
        organizationTitlesUpdated,
        defaultProjectTitlesUpdated,
        departmentManagersUpdated,
        userManagersUpdated,
        skippedExists,
        missingUsers,
        missingDepartments: [...new Set(missingDepartments)],
        missingSystemRoles: [...new Set(missingSystemRoles)],
        missingOrganizationTitles: [...new Set(missingOrganizationTitles)],
        missingProjectTitles: [...new Set(missingProjectTitles)],
        missingManagerUsers: [...new Set(missingManagerUsers)],
        missingManagerDepartments: [...new Set(missingManagerDepartments)],
        missingManagedUsers: [...new Set(missingManagedUsers)]
      },
      null,
      2
    )
  );
}

function parseRoleCodes(roleCode: string | null): string[] {
  return (roleCode ?? "")
    .split("+")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

main();

