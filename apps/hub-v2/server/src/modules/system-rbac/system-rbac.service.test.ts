import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { SystemRbacRepo } from "./system-rbac.repo";
import { SystemRbacService } from "./system-rbac.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      avatar_upload_id TEXT
    );

    CREATE TABLE system_roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      purpose_code TEXT NOT NULL DEFAULT 'platform_admin',
      purpose_name TEXT NOT NULL DEFAULT '平台管理角色',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE system_permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      group_code TEXT NOT NULL,
      group_name TEXT NOT NULL,
      domain_code TEXT NOT NULL DEFAULT 'admin',
      domain_name TEXT NOT NULL DEFAULT '后台管理',
      description TEXT,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE system_role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE user_system_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, role_id)
    );
  `);

  db.prepare("INSERT INTO users (id, username, display_name, email) VALUES (?, ?, ?, ?)").run("usr_1", "u1", "用户一", "u1@test.com");
  db.prepare("INSERT INTO users (id, username, display_name, email) VALUES (?, ?, ?, ?)").run("usr_2", "u2", "用户二", "u2@test.com");
  db.prepare("INSERT INTO users (id, username, display_name, email) VALUES (?, ?, ?, ?)").run("usr_admin", "admin", "管理员", "admin@test.com");

  const now = new Date().toISOString();
  db.prepare("INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("srole_super_admin", "super_admin", "超级管理员", "Full access", 1, "hybrid", "混合角色", "active", 10, now, now);
  db.prepare("INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("srole_admin", "admin", "管理员", "Admin access", 1, "platform_admin", "平台管理角色", "active", 20, now, now);
  db.prepare("INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("srole_member", "member", "成员", "Member access", 1, "platform_admin", "平台管理角色", "active", 30, now, now);

  db.prepare("INSERT INTO system_permissions (id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("sperm_1", "admin.dashboard.view", "查看仪表盘", "admin", "后台管理", "admin", "后台管理", null, 10, now, now);
  db.prepare("INSERT INTO system_permissions (id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("sperm_2", "admin.users.manage", "管理用户", "admin", "后台管理", "admin", "后台管理", null, 20, now, now);
  db.prepare("INSERT INTO system_permissions (id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("sperm_3", "admin.roles.manage", "管理系统角色", "admin", "后台管理", "admin", "后台管理", null, 30, now, now);

  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run("srole_super_admin", "sperm_1", now);
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run("srole_super_admin", "sperm_2", now);
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run("srole_super_admin", "sperm_3", now);
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run("srole_admin", "sperm_1", now);
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run("srole_admin", "sperm_2", now);
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)").run("srole_member", "sperm_1", now);

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

describe("SystemRbacService", () => {
  it("lists system roles with counts", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const roles = await service.listSystemRoles({}, adminCtx);
      assert.equal(roles.length, 3);
      const superAdmin = roles.find((r) => r.code === "super_admin");
      assert.ok(superAdmin);
      assert.equal(superAdmin.permissionCount, 3);
      assert.equal(superAdmin.isBuiltin, true);
    } finally {
      db.close();
    }
  });

  it("creates custom role and rejects duplicate code", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const role = await service.createSystemRole({ code: "qa_lead", name: "QA负责人" }, adminCtx);
      assert.equal(role.code, "qa_lead");
      assert.equal(role.isBuiltin, false);
      assert.equal(role.purposeCode, "business");

      await assert.rejects(
        () => service.createSystemRole({ code: "qa_lead", name: "duplicate" }, adminCtx),
        /already exists/
      );
    } finally {
      db.close();
    }
  });

  it("rejects non-admin from creating role", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      await assert.rejects(
        () => service.createSystemRole({ code: "blocked", name: "blocked" }, userCtx),
        /forbidden/
      );
    } finally {
      db.close();
    }
  });

  it("rejects non-admin from reading system roles", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      await assert.rejects(
        () => service.listSystemRoles({}, userCtx),
        /forbidden/
      );
    } finally {
      db.close();
    }
  });

  it("prevents updating built-in role", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      await assert.rejects(
        () => service.updateSystemRole("srole_admin", { name: "changed" }, adminCtx),
        /cannot be modified/
      );
    } finally {
      db.close();
    }
  });

  it("prevents deleting built-in role", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      await assert.rejects(
        () => service.deleteSystemRole("srole_admin", adminCtx),
        /cannot be deleted/
      );
    } finally {
      db.close();
    }
  });

  it("deletes custom role", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const role = await service.createSystemRole({ code: "temp", name: "临时" }, adminCtx);
      await service.deleteSystemRole(role.id, adminCtx);
      await assert.rejects(
        () => service.getSystemRoleDetail(role.id, adminCtx),
        /not found/
      );
    } finally {
      db.close();
    }
  });

  it("sets role permissions on custom role", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const role = await service.createSystemRole({ code: "custom1", name: "自定义1" }, adminCtx);
      await service.setRolePermissions(role.id, { permissionIds: ["sperm_1", "sperm_3"] }, adminCtx);
      const detail = await service.getSystemRoleDetail(role.id, adminCtx);
      assert.equal(detail.permissions.length, 2);
      assert.equal(detail.permissionCount, 2);
    } finally {
      db.close();
    }
  });

  it("prevents setting permissions on built-in role", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      await assert.rejects(
        () => service.setRolePermissions("srole_admin", { permissionIds: ["sperm_1"] }, adminCtx),
        /cannot be modified/
      );
    } finally {
      db.close();
    }
  });

  it("rejects unknown permission ids before saving", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const role = await service.createSystemRole({ code: "invalid_perm", name: "非法权限测试" }, adminCtx);
      await assert.rejects(
        () => service.setRolePermissions(role.id, { permissionIds: ["missing_perm"] }, adminCtx),
        /permission not found/
      );
      const detail = await service.getSystemRoleDetail(role.id, adminCtx);
      assert.equal(detail.permissions.length, 0);
    } finally {
      db.close();
    }
  });

  it("creates role with permission template", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const role = await service.createSystemRole(
        { code: "admin_copy", name: "管理员副本", permissionTemplateRoleId: "srole_admin" },
        adminCtx
      );
      const detail = await service.getSystemRoleDetail(role.id, adminCtx);
      assert.equal(detail.permissions.length, 2);
    } finally {
      db.close();
    }
  });

  it("adds and removes role users", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const role = await service.createSystemRole({ code: "team_lead", name: "组长" }, adminCtx);

      await service.addRoleUsers(role.id, { userIds: ["usr_1", "usr_2"] }, adminCtx);
      let users = await service.listRoleUsers(role.id, adminCtx);
      assert.equal(users.length, 2);

      await service.removeRoleUser(role.id, "usr_1", adminCtx);
      users = await service.listRoleUsers(role.id, adminCtx);
      assert.equal(users.length, 1);
      assert.equal(users[0].userId, "usr_2");
    } finally {
      db.close();
    }
  });

  it("add user is idempotent", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const role = await service.createSystemRole({ code: "idempotent", name: "幂等测试" }, adminCtx);
      await service.addRoleUsers(role.id, { userIds: ["usr_1"] }, adminCtx);
      await service.addRoleUsers(role.id, { userIds: ["usr_1"] }, adminCtx);
      const users = await service.listRoleUsers(role.id, adminCtx);
      assert.equal(users.length, 1);
    } finally {
      db.close();
    }
  });

  it("lists user system roles", async () => {
    const db = createDb();
    try {
      db.prepare("INSERT INTO user_system_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)").run("usr_1", "usr_1", "srole_admin", new Date().toISOString());
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const roles = await service.listUserSystemRoles("usr_1", adminCtx);
      assert.equal(roles.length, 1);
      assert.equal(roles[0].roleCode, "admin");
    } finally {
      db.close();
    }
  });

  it("lists all permissions", async () => {
    const db = createDb();
    try {
      const service = new SystemRbacService(new SystemRbacRepo(db));
      const permissions = await service.listPermissions(adminCtx);
      assert.equal(permissions.length, 3);
      assert.equal(permissions[0].domainCode, "admin");
    } finally {
      db.close();
    }
  });
});
