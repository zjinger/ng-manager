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
      display_name TEXT,
      organization_title_code TEXT
    );

    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      external_finance_code TEXT,
      manager_user_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE user_departments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      role_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, department_id)
    );
    CREATE UNIQUE INDEX idx_user_departments_primary ON user_departments(user_id);

    CREATE TABLE organization_titles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      sort INTEGER NOT NULL DEFAULT 0,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE department_titles (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      organization_title_code TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(department_id, organization_title_code)
    );
  `);
  return db;
}

const adminCtx = createRequestContext({
  accountId: "adm_1",
  userId: "usr_admin",
  roles: ["admin"],
  authScopes: ["admin.departments.manage"],
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

  it("rejects assigning more than one department to a user", async () => {
    const db = createDb();
    try {
      db.prepare("INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)").run("usr_1", "u1", "用户一");
      const service = new OrganizationService(new OrganizationRepo(db));
      const dep1 = await service.createDepartment({ code: "dep1", name: "部门一" }, adminCtx);
      const dep2 = await service.createDepartment({ code: "dep2", name: "部门二" }, adminCtx);

      assert.throws(
        () =>
          service.replaceUserDepartmentsFromUserModule("usr_1", [
            { departmentId: dep1.id },
            { departmentId: dep2.id }
          ]),
        /only one department/
      );
    } finally {
      db.close();
    }
  });

  it("stores department manager and replaces the user department", async () => {
    const db = createDb();
    try {
      db.prepare("INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)").run("usr_1", "u1", "用户一");
      db.prepare("INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)").run("usr_2", "u2", "用户二");
      const service = new OrganizationService(new OrganizationRepo(db));
      const dep1 = await service.createDepartment({ code: "dep1", name: "部门一", description: "核心业务部门", managerUserId: "usr_2" }, adminCtx);
      const dep2 = await service.createDepartment({ code: "dep2", name: "部门二" }, adminCtx);

      const created = await service.listDepartments({ keyword: "dep1" }, adminCtx);
      assert.equal(created[0].managerUserId, "usr_2");
      assert.equal(created[0].managerUser?.username, "u2");
      assert.equal(created[0].description, "核心业务部门");

      await service.addUserDepartment("usr_1", { departmentId: dep1.id }, adminCtx);
      await service.addUserDepartment("usr_1", { departmentId: dep2.id }, adminCtx);
      const departments = await service.listUserDepartments("usr_1", userCtx);
      assert.equal(departments.length, 1);
      assert.equal(departments[0].departmentId, dep2.id);
    } finally {
      db.close();
    }
  });

  it("manages department title bindings and counts members", async () => {
    const db = createDb();
    try {
      db.prepare("INSERT INTO users (id, username, display_name) VALUES (?, ?, ?)").run("usr_1", "u1", "用户一");
      db.prepare("INSERT INTO organization_titles (id, code, name, status, sort, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("title_1", "frontend_dev", "前端开发", "active", 10, null, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");

      const service = new OrganizationService(new OrganizationRepo(db));
      const dep = await service.createDepartment({ code: "dep1", name: "部门一" }, adminCtx);
      await service.addUserDepartment("usr_1", { departmentId: dep.id }, adminCtx);
      db.prepare("UPDATE users SET organization_title_code = ? WHERE id = ?").run("frontend_dev", "usr_1");

      await service.addDepartmentTitle(dep.id, { titleCode: "frontend_dev" }, adminCtx);
      const titles = await service.listDepartmentTitles(dep.id, adminCtx);

      assert.equal(titles.length, 1);
      assert.equal(titles[0].titleCode, "frontend_dev");
      assert.equal(titles[0].memberCount, 1);

      await service.removeDepartmentTitle(dep.id, "frontend_dev", adminCtx);
      const nextTitles = await service.listDepartmentTitles(dep.id, adminCtx);
      assert.equal(nextTitles.length, 0);
    } finally {
      db.close();
    }
  });
});
