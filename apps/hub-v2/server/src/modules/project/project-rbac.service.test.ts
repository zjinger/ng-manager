import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import type { EventBus } from "../../shared/event/event-bus";
import { ProjectAccessService } from "./project-access.service";
import { ProjectAuthorizationService } from "./project-authorization.service";
import { ProjectRepo } from "./project.repo";
import { ProjectService } from "./project.service";
import { UserRepo } from "../user/user.repo";
import { RdRepo } from "../rd/rd.repo";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      mobile TEXT,
      title_code TEXT,
      default_project_title_code TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      source TEXT NOT NULL DEFAULT 'local',
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE admin_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar_upload_id TEXT,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      project_key TEXT NOT NULL UNIQUE,
      project_no TEXT NOT NULL UNIQUE,
      display_code TEXT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      avatar_upload_id TEXT,
      project_type TEXT NOT NULL,
      contract_no TEXT,
      delivery_date TEXT,
      product_line TEXT,
      sla_level TEXT,
      status TEXT NOT NULL,
      visibility TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role_code TEXT NOT NULL,
      is_owner INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
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
    CREATE TABLE system_permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      group_code TEXT NOT NULL,
      group_name TEXT NOT NULL,
      domain_code TEXT NOT NULL,
      domain_name TEXT NOT NULL,
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
    CREATE TABLE project_titles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.prepare(
    `INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at)
     VALUES (?, ?, ?, '', 0, 'platform_admin', '平台管理角色', 'active', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run("role_project_ops", "project_ops", "项目管理");
  db.prepare(
    `INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at)
     VALUES (?, ?, ?, '', 1, 'platform_admin', '平台管理角色', 'active', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run("srole_super_admin", "super_admin", "超级管理员");
  db.prepare(
    `INSERT INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at)
     VALUES (?, ?, ?, '', 1, 'platform_admin', '平台管理角色', 'active', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run("srole_admin", "admin", "管理员");
  db.prepare(
    `INSERT INTO project_titles (id, code, name, status, sort, remark, created_at, updated_at)
     VALUES ('ptitle_member', 'member', '成员', 'active', 10, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();

  const permissions = [
    ["perm_read_all", "project.read.all"],
    ["perm_manage_all", "project.manage.all"],
    ["perm_archive", "project.archive"],
    ["perm_owner_transfer", "project.owner.transfer"]
  ] as const;
  for (const [id, code] of permissions) {
    db.prepare(
      `INSERT INTO system_permissions (id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at)
       VALUES (?, ?, ?, 'project', '项目管理', 'project', '项目管理', '', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
    ).run(id, code, code);
  }

  const users = [
    ["usr_owner", "owner"],
    ["usr_member", "member"],
    ["usr_operator", "operator"]
  ] as const;
  for (const [id, username] of users) {
    db.prepare(
      `INSERT INTO users (id, username, display_name, email, mobile, title_code, default_project_title_code, status, source, remark, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, NULL, NULL, 'active', 'local', NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
    ).run(id, username, username);
  }

  db.prepare(
    `INSERT INTO projects (id, project_key, project_no, display_code, name, description, icon, avatar_upload_id, project_type, contract_no, delivery_date, product_line, sla_level, status, visibility, created_at, updated_at)
     VALUES ('prj_1', 'prj_key_1', 'P001', 'P01', '测试项目', NULL, NULL, NULL, 'self_dev', NULL, NULL, NULL, NULL, 'active', 'private', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();

  db.prepare(
    `INSERT INTO project_members (id, project_id, user_id, display_name, role_code, is_owner, joined_at, created_at, updated_at)
     VALUES ('pm_owner', 'prj_1', 'usr_owner', 'owner', 'project_admin', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
            ('pm_member', 'prj_1', 'usr_member', 'member', 'member', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();

  return db;
}

function grantPermission(db: Database.Database, userId: string, permissionCode: string) {
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id, created_at) SELECT 'role_project_ops', id, '2026-01-02T00:00:00.000Z' FROM system_permissions WHERE code = ?")
    .run(permissionCode);
  db.prepare("INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at) VALUES (?, ?, 'role_project_ops', '2026-01-02T00:00:00.000Z')")
    .run(`usr_role_project_ops_${userId}`, userId);
}

const eventBus: EventBus = {
  async emit() {},
  subscribe() {
    return () => {};
  }
};

describe("project RBAC integration", () => {
  it("allows private project read with project.read.all", async () => {
    const db = createDb();
    try {
      grantPermission(db, "usr_operator", "project.read.all");
      const repo = new ProjectRepo(db);
      const authorization = new ProjectAuthorizationService(db, repo);
      const access = new ProjectAccessService(repo, authorization);

      await assert.doesNotReject(() =>
        access.requireProjectAccess("prj_1", createRequestContext({
          accountId: "adm_operator",
          userId: "usr_operator",
          roles: ["user"],
          source: "http"
        }), "get project")
      );
    } finally {
      db.close();
    }
  });

  it("lists all active project ids for project.read.all users", async () => {
    const db = createDb();
    try {
      grantPermission(db, "usr_operator", "project.read.all");
      db.prepare(
        `INSERT INTO projects (id, project_key, project_no, display_code, name, description, icon, avatar_upload_id, project_type, contract_no, delivery_date, product_line, sla_level, status, visibility, created_at, updated_at)
         VALUES ('prj_2', 'prj_key_2', 'P002', 'P02', '第二个项目', NULL, NULL, NULL, 'self_dev', NULL, NULL, NULL, NULL, 'active', 'private', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
                ('prj_archived', 'prj_key_archived', 'P003', 'P03', '归档项目', NULL, NULL, NULL, 'self_dev', NULL, NULL, NULL, NULL, 'inactive', 'private', '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z')`
      ).run();
      const repo = new ProjectRepo(db);
      const authorization = new ProjectAuthorizationService(db, repo);
      const access = new ProjectAccessService(repo, authorization);

      const projectIds = await access.listAccessibleProjectIds(createRequestContext({
        accountId: "adm_operator",
        userId: "usr_operator",
        roles: ["user"],
        source: "http"
      }));

      assert.deepEqual(projectIds.sort(), ["prj_1", "prj_2"]);
    } finally {
      db.close();
    }
  });

  it("allows non-member to update a project with project.manage.all", async () => {
    const db = createDb();
    try {
      grantPermission(db, "usr_operator", "project.manage.all");
      const repo = new ProjectRepo(db);
      const authorization = new ProjectAuthorizationService(db, repo);
      const access = new ProjectAccessService(repo, authorization);
      const service = new ProjectService(repo, new UserRepo(db), new RdRepo(db), access, authorization, eventBus, db);

      const updated = await service.update("prj_1", { name: "更新后的项目名" }, createRequestContext({
        accountId: "adm_operator",
        userId: "usr_operator",
        roles: ["user"],
        source: "http"
      }));

      assert.equal(updated.name, "更新后的项目名");
    } finally {
      db.close();
    }
  });

  it("allows non-member to archive a project with project.archive", async () => {
    const db = createDb();
    try {
      grantPermission(db, "usr_operator", "project.archive");
      const repo = new ProjectRepo(db);
      const authorization = new ProjectAuthorizationService(db, repo);
      const access = new ProjectAccessService(repo, authorization);
      const service = new ProjectService(repo, new UserRepo(db), new RdRepo(db), access, authorization, eventBus, db);

      const updated = await service.update("prj_1", { status: "inactive" }, createRequestContext({
        accountId: "adm_operator",
        userId: "usr_operator",
        roles: ["user"],
        source: "http"
      }));

      assert.equal(updated.status, "inactive");
    } finally {
      db.close();
    }
  });

  it("allows non-member to transfer owner with project.owner.transfer", async () => {
    const db = createDb();
    try {
      grantPermission(db, "usr_operator", "project.owner.transfer");
      const repo = new ProjectRepo(db);
      const authorization = new ProjectAuthorizationService(db, repo);
      const access = new ProjectAccessService(repo, authorization);
      const service = new ProjectService(repo, new UserRepo(db), new RdRepo(db), access, authorization, eventBus, db);

      const updated = await service.updateMember("prj_1", "pm_member", { isOwner: true }, createRequestContext({
        accountId: "adm_operator",
        userId: "usr_operator",
        roles: ["user"],
        source: "http"
      }));

      assert.equal(updated.isOwner, true);
      assert.equal(updated.roleCode, "project_admin");
      const previousOwner = repo.findMemberById("prj_1", "pm_owner");
      assert.equal(previousOwner?.isOwner, false);
    } finally {
      db.close();
    }
  });

  it("excludes super admin and initial admin from project member candidates", async () => {
    const db = createDb();
    try {
      db.prepare(
        `INSERT INTO users (id, username, display_name, email, mobile, title_code, default_project_title_code, status, source, remark, created_at, updated_at)
         VALUES ('usr_init_admin', 'admin', '系统管理员', NULL, NULL, NULL, NULL, 'active', 'local', NULL, '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z'),
                ('usr_super_admin', 'root', '超级管理员', NULL, NULL, NULL, NULL, 'active', 'local', NULL, '2026-01-04T00:00:00.000Z', '2026-01-04T00:00:00.000Z'),
                ('usr_real_admin', 'realadmin', '真实管理员', NULL, NULL, NULL, 'member', 'active', 'local', NULL, '2026-01-05T00:00:00.000Z', '2026-01-05T00:00:00.000Z')`
      ).run();
      db.prepare(
        `INSERT INTO user_system_roles (id, user_id, role_id, created_at)
         VALUES ('usr_super_admin_role', 'usr_super_admin', 'srole_super_admin', '2026-01-04T00:00:00.000Z'),
                ('usr_real_admin_role', 'usr_real_admin', 'srole_admin', '2026-01-05T00:00:00.000Z')`
      ).run();
      const repo = new ProjectRepo(db);
      const authorization = new ProjectAuthorizationService(db, repo);
      const access = new ProjectAccessService(repo, authorization);
      const service = new ProjectService(repo, new UserRepo(db), new RdRepo(db), access, authorization, eventBus, db, "admin");

      const candidates = await service.listMemberCandidates("prj_1", createRequestContext({
        accountId: "adm_owner",
        userId: "usr_owner",
        roles: ["user"],
        source: "http"
      }));
      const usernames = candidates.map((item) => item.username).sort();

      assert.equal(usernames.includes("admin"), false);
      assert.equal(usernames.includes("root"), false);
      assert.equal(usernames.includes("realadmin"), true);
    } finally {
      db.close();
    }
  });
});
