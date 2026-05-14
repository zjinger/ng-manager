import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { SystemRbacRepo } from "./system-rbac.repo";
import { PlatformRoleSyncService } from "./platform-role-sync.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE system_roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      purpose_code TEXT NOT NULL,
      purpose_name TEXT NOT NULL,
      status TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE user_system_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, role_id)
    );

    INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at)
    VALUES
      ('srole_admin', 'admin', '管理员', '', 1, 'platform_admin', '平台管理角色', 'active', 10, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('srole_member', 'member', '成员', '', 1, 'platform_admin', '平台管理角色', 'active', 20, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('srole_finance', 'finance_reviewer', '财务复核', '', 1, 'business', '业务角色', 'active', 30, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
  `);
  return db;
}

describe("PlatformRoleSyncService", () => {
  it("assigns member role for legacy user accounts", () => {
    const db = createDb();
    try {
      const service = new PlatformRoleSyncService(new SystemRbacRepo(db));
      service.syncFromLegacyRole("usr_1", "user", "2026-01-02T00:00:00.000Z");

      const rows = db.prepare("SELECT role_id FROM user_system_roles WHERE user_id = ?").all("usr_1") as Array<{ role_id: string }>;
      assert.deepEqual(rows.map((row) => row.role_id), ["srole_member"]);
    } finally {
      db.close();
    }
  });

  it("switches admin/member platform role and preserves business roles", () => {
    const db = createDb();
    try {
      db.prepare("INSERT INTO user_system_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)")
        .run("usr_finance_usr_1", "usr_1", "srole_finance", "2026-01-01T00:00:00.000Z");

      const service = new PlatformRoleSyncService(new SystemRbacRepo(db));
      service.syncFromLegacyRole("usr_1", "user", "2026-01-02T00:00:00.000Z");
      service.syncFromLegacyRole("usr_1", "admin", "2026-01-03T00:00:00.000Z");

      const rows = db.prepare("SELECT role_id FROM user_system_roles WHERE user_id = ? ORDER BY role_id").all("usr_1") as Array<{ role_id: string }>;
      assert.deepEqual(rows.map((row) => row.role_id), ["srole_admin", "srole_finance"]);
    } finally {
      db.close();
    }
  });
});
