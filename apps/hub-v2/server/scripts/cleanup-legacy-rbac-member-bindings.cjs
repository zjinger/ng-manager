#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const dotenv = require("dotenv");

const SCRIPT_NAME = "cleanup-legacy-rbac-member-bindings";

function parseArgs(argv) {
  const options = {
    apply: false,
    backup: true,
    dbPath: null,
    envFile: null,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--no-backup") {
      options.backup = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--db") {
      options.dbPath = argv[index + 1] || null;
      index += 1;
    } else if (arg.startsWith("--db=")) {
      options.dbPath = arg.slice("--db=".length);
    } else if (arg === "--env") {
      options.envFile = argv[index + 1] || null;
      index += 1;
    } else if (arg.startsWith("--env=")) {
      options.envFile = arg.slice("--env=".length);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/cleanup-legacy-rbac-member-bindings.cjs [--db /path/to/hub-v2.db] [--env /path/to/.env.production] [--apply]

Description:
  Removes legacy auto-created RBAC member bindings only:
    - id = 'usr_member_' || user_id created by old 0042 migration
    - id = 'usr_sync_' || user_id || '_member' created by old startup sync

Safety:
  Default mode is dry-run. Add --apply to delete rows.
  In --apply mode, a SQLite backup is created next to the database unless --no-backup is passed.

Examples:
  node scripts/cleanup-legacy-rbac-member-bindings.cjs --env .env.production
  node scripts/cleanup-legacy-rbac-member-bindings.cjs --db /opt/ngm-hub-v2/data/hub-v2.db --apply
`.trim());
}

function loadEnvFile(explicitEnvFile) {
  const candidates = explicitEnvFile
    ? [path.resolve(explicitEnvFile)]
    : [
        path.join(process.cwd(), ".env.production"),
        path.join(process.cwd(), ".env")
      ];

  for (const file of candidates) {
    if (file && fs.existsSync(file)) {
      dotenv.config({ path: file });
      return file;
    }
  }

  return null;
}

function resolveDbPath(options) {
  if (options.dbPath) {
    return path.resolve(options.dbPath);
  }

  const envFile = loadEnvFile(options.envFile);
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "hub-v2.db");

  return {
    dbPath,
    envFile
  };
}

function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(tableName);
  return !!row;
}

function assertRequiredTables(db) {
  const requiredTables = ["user_system_roles", "system_roles", "admin_accounts", "users"];
  const missing = requiredTables.filter((tableName) => !tableExists(db, tableName));
  if (missing.length > 0) {
    throw new Error(`missing required tables: ${missing.join(", ")}`);
  }
}

function listLegacyRows(db) {
  const migrationRows = db
    .prepare(
      `
        SELECT
          ur.id,
          ur.user_id AS userId,
          ur.role_id AS roleId,
          ur.created_at AS createdAt,
          a.username,
          u.display_name AS displayName,
          '0042_migration_member_seed' AS source
        FROM user_system_roles ur
        INNER JOIN system_roles sr ON sr.id = ur.role_id
        INNER JOIN admin_accounts a ON a.user_id = ur.user_id
        LEFT JOIN users u ON u.id = ur.user_id
        WHERE sr.code = 'member'
          AND ur.id = 'usr_member_' || ur.user_id
          AND a.role = 'user'
        ORDER BY a.username ASC
      `
    )
    .all();

  const syncRows = db
    .prepare(
      `
        SELECT
          ur.id,
          ur.user_id AS userId,
          ur.role_id AS roleId,
          ur.created_at AS createdAt,
          a.username,
          u.display_name AS displayName,
          'legacy_startup_member_sync' AS source
        FROM user_system_roles ur
        INNER JOIN system_roles sr ON sr.id = ur.role_id
        INNER JOIN admin_accounts a ON a.user_id = ur.user_id
        LEFT JOIN users u ON u.id = ur.user_id
        WHERE sr.code = 'member'
          AND ur.id = 'usr_sync_' || ur.user_id || '_member'
        ORDER BY a.username ASC
      `
    )
    .all();

  const rowsById = new Map();
  for (const row of [...migrationRows, ...syncRows]) {
    rowsById.set(row.id, row);
  }
  return Array.from(rowsById.values());
}

function listUsersWithoutRoles(db) {
  return db
    .prepare(
      `
        SELECT a.username, a.user_id AS userId, u.display_name AS displayName
        FROM admin_accounts a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN user_system_roles ur ON ur.user_id = a.user_id
        WHERE a.user_id IS NOT NULL
        GROUP BY a.id, a.username, a.user_id, u.display_name
        HAVING COUNT(ur.role_id) = 0
        ORDER BY a.username ASC
      `
    )
    .all();
}

async function backupDatabase(db, dbPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.${SCRIPT_NAME}.${timestamp}.bak`;
  await db.backup(backupPath);
  return backupPath;
}

function deleteRows(db, rows) {
  const deleteById = db.prepare("DELETE FROM user_system_roles WHERE id = ?");
  const transaction = db.transaction((items) => {
    let deleted = 0;
    for (const item of items) {
      const result = deleteById.run(item.id);
      deleted += result.changes || 0;
    }
    return deleted;
  });
  return transaction(rows);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const resolved = resolveDbPath(options);
  const dbPath = typeof resolved === "string" ? resolved : resolved.dbPath;
  const envFile = typeof resolved === "string" ? loadEnvFile(options.envFile) : resolved.envFile;

  if (!fs.existsSync(dbPath)) {
    throw new Error(`database file not found: ${dbPath}`);
  }

  const db = new Database(dbPath);
  try {
    db.pragma("foreign_keys = ON");
    assertRequiredTables(db);

    const rows = listLegacyRows(db);
    const beforeUsersWithoutRoles = listUsersWithoutRoles(db);

    console.log(
      JSON.stringify(
        {
          script: SCRIPT_NAME,
          mode: options.apply ? "apply" : "dry-run",
          dbPath,
          envFile,
          matchedRows: rows.length,
          rows,
          usersWithoutRolesBefore: beforeUsersWithoutRoles
        },
        null,
        2
      )
    );

    if (!options.apply) {
      console.log("Dry-run only. Re-run with --apply to delete matched rows.");
      return;
    }

    let backupPath = null;
    if (options.backup) {
      backupPath = await backupDatabase(db, dbPath);
    }

    const deletedRows = deleteRows(db, rows);
    const afterUsersWithoutRoles = listUsersWithoutRoles(db);

    console.log(
      JSON.stringify(
        {
          script: SCRIPT_NAME,
          applied: true,
          backupPath,
          deletedRows,
          usersWithoutRolesAfter: afterUsersWithoutRoles
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT_NAME}] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
