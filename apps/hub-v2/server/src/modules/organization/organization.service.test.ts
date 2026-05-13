import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { OrganizationRepo } from "./organization.repo";
import { OrganizationService } from "./organization.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT
    );

    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      external_finance_code TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE user_departments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      relation_type TEXT NOT NULL DEFAULT 'secondary',
      role_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, department_id)
    );
    CREATE UNIQUE INDEX idx_user_departments_primary
      ON user_departments(user_id)
      WHERE relation_type = 'primary';

    CREATE TABLE finance_roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE user_finance_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, role_id)
    );
  `);
  return db;
}

const adminCtx = createRequestContext({
  accountId: "adm_1",
  userId: "usr_admin",
  roles: ["admin"],
  source: "http"
});

const userCtx = createRequestContext({
  accountId: "adm_2",
  userId: "usr_1",
  roles: ["user"],
  source: "http"
});

describe("OrganizationService", () => {
  it("creates departments and builds a tree", async () => {
    const db = createDb();
    try {
      const service = new OrganizationService(new OrganizationRepo(db));
      const root = await service.createDepartment({ code: "finance", name: "财务部" }, adminCtx);
      await service.createDepartment({ code: "finance-ap", name: "应付组", parentId: root.id }, adminCtx);

      const tree = await service.listDepartmentTree({}, adminCtx);

      assert.equal(tree.length, 1);
      assert.equal(tree[0]?.code, "finance");
      assert.equal(tree[0]?.children[0]?.code, "finance-ap");
    } finally {
      db.close();
    }
  });

  it("rejects more than one primary department for a user", async () => {
    const db = createDb();
    try {
      db.prepare("INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)").run("usr_1", "u1", "用户一");
      const service = new OrganizationService(new OrganizationRepo(db));
      const dep1 = await service.createDepartment({ code: "dep1", name: "部门一" }, adminCtx);
      const dep2 = await service.createDepartment({ code: "dep2", name: "部门二" }, adminCtx);

      assert.throws(
        () =>
          service.replaceUserDepartmentsFromUserModule("usr_1", [
            { departmentId: dep1.id, relationType: "primary" },
            { departmentId: dep2.id, relationType: "primary" }
          ]),
        /only one primary department/
      );
    } finally {
      db.close();
    }
  });

  it("keeps finance roles independent from system permissions", async () => {
    const db = createDb();
    try {
      db.prepare("INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)").run("usr_1", "u1", "用户一");
      const service = new OrganizationService(new OrganizationRepo(db));
      const role = await service.createFinanceRole({ code: "finance_viewer", name: "财务查看" }, adminCtx);
      const assigned = await service.addUserFinanceRole("usr_1", role.id, adminCtx);

      assert.equal(assigned.roleCode, "finance_viewer");
      await assert.rejects(
        () => service.createFinanceRole({ code: "blocked", name: "无权限" }, userCtx),
        /forbidden/
      );
    } finally {
      db.close();
    }
  });
});
