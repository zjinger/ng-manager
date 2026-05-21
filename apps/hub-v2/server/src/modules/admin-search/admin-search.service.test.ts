import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { AdminSearchService } from "./admin-search.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      mobile TEXT,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      external_finance_code TEXT,
      status TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE system_roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      purpose_name TEXT NOT NULL,
      status TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE system_permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      group_code TEXT NOT NULL,
      group_name TEXT NOT NULL,
      domain_code TEXT NOT NULL,
      domain_name TEXT NOT NULL,
      status TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE admin_audit_logs (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      level TEXT NOT NULL,
      actor_name TEXT,
      target_name TEXT,
      target_id TEXT,
      summary TEXT NOT NULL,
      ip TEXT,
      request_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.prepare("INSERT INTO users (id, username, display_name, email, mobile, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("usr_1", "alice", "Alice Admin", "alice@test.local", "13800000000", "active", "2026-01-01T00:00:00.000Z");
  db.prepare("INSERT INTO departments (id, code, name, external_finance_code, status, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("dept_1", "platform", "平台部门", "FIN-001", "active", 1, "2026-01-02T00:00:00.000Z");
  db.prepare("INSERT INTO system_roles (id, code, name, description, purpose_name, status, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run("role_1", "super_admin", "超级管理员", "平台超级管理员", "平台管理角色", "active", 1, "2026-01-03T00:00:00.000Z");
  db.prepare("INSERT INTO system_permissions (id, code, name, group_code, group_name, domain_code, domain_name, status, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("perm_1", "admin.users.manage", "管理用户", "admin", "后台管理", "admin", "后台管理", "active", 1, "2026-01-04T00:00:00.000Z");
  db.prepare("INSERT INTO admin_audit_logs (id, module, action, level, actor_name, target_name, target_id, summary, ip, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("audit_1", "user", "update", "info", "Administrator", "Alice Admin", "usr_1", "更新用户 Alice Admin", "127.0.0.1", "req_1", "2026-01-05T00:00:00.000Z");

  return db;
}

function ctx(scopes: string[]) {
  return createRequestContext({
    accountId: "adm_1",
    userId: "usr_admin",
    roles: ["user"],
    authScopes: scopes,
    source: "http"
  });
}

describe("AdminSearchService", () => {
  it("returns empty results for short keywords", () => {
    const db = createDb();
    try {
      const service = new AdminSearchService(db);
      const result = service.search({ q: "a", limit: 20 }, ctx(["admin.users.manage"]));
      assert.deepEqual(result, { items: [], total: 0 });
    } finally {
      db.close();
    }
  });

  it("filters result domains by current permissions", () => {
    const db = createDb();
    try {
      const service = new AdminSearchService(db);
      const result = service.search({ q: "admin", limit: 20 }, ctx(["admin.users.manage"]));
      assert.equal(result.items.every((item) => item.type === "user"), true);
      assert.equal(result.items.some((item) => item.type === "role"), false);
    } finally {
      db.close();
    }
  });

  it("supports types filter, limit, setting entries and target urls", () => {
    const db = createDb();
    try {
      const service = new AdminSearchService(db);
      const result = service.search(
        { q: "管理", types: ["role", "permission", "setting"], limit: 2 },
        ctx(["admin.roles.manage", "admin.settings.manage"])
      );

      assert.equal(result.items.length, 2);
      assert.equal(result.items.every((item) => ["role", "permission", "setting"].includes(item.type)), true);
      assert.equal(result.total >= 2, true);
      assert.equal(result.items.some((item) => item.url.includes("keyword=")), true);
    } finally {
      db.close();
    }
  });

  it("returns audit log results only with audit permission", () => {
    const db = createDb();
    try {
      const service = new AdminSearchService(db);
      const withoutAudit = service.search({ q: "Alice", types: ["audit_log"], limit: 20 }, ctx(["admin.users.manage"]));
      const withAudit = service.search({ q: "Alice", types: ["audit_log"], limit: 20 }, ctx(["admin.audit.view"]));

      assert.equal(withoutAudit.total, 0);
      assert.equal(withAudit.items[0]?.type, "audit_log");
      assert.equal(withAudit.items[0]?.url, "/admin/audit?keyword=Alice");
    } finally {
      db.close();
    }
  });
});
