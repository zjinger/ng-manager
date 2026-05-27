import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import type { EventBus } from "../../shared/event/event-bus";
import { RdRepo } from "../rd/rd.repo";
import { UserRepo } from "../user/user.repo";
import { ProjectAccessService } from "./project-access.service";
import { ProjectAuthorizationService } from "./project-authorization.service";
import { ProjectRepo } from "./project.repo";
import { ProjectService } from "./project.service";

const eventBus: EventBus = {
  async emit() {},
  subscribe() {
    return () => {};
  }
};

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
    CREATE TABLE project_modules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      project_no TEXT,
      parent_id TEXT,
      node_type TEXT NOT NULL DEFAULT 'module',
      owner_user_id TEXT,
      icon_code TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      progress INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0,
      "desc" TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_module_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_code TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_module_rd_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      rd_item_id TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_environments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0,
      "desc" TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      version TEXT NOT NULL,
      code TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0,
      "desc" TEXT,
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
    CREATE TABLE project_feature_progress_settings (
      project_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_feature_points (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      module_id TEXT,
      owner_user_id TEXT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      progress INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_feature_progress_overrides (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      progress INTEGER NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, target_type, target_id)
    );
  `);

  db.prepare(
    `INSERT INTO users (id, username, display_name, email, mobile, title_code, default_project_title_code, status, source, remark, created_at, updated_at)
     VALUES ('usr_owner', 'owner', '项目负责人', NULL, NULL, NULL, NULL, 'active', 'local', NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
            ('usr_member', 'member', '项目成员', NULL, NULL, NULL, NULL, 'active', 'local', NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();
  db.prepare(
    `INSERT INTO projects (id, project_key, project_no, display_code, name, description, icon, avatar_upload_id, project_type, contract_no, delivery_date, product_line, sla_level, status, visibility, created_at, updated_at)
     VALUES ('prj_1', 'prj_key_1', 'P001', 'P01', '测试项目', NULL, NULL, NULL, 'self_dev', NULL, NULL, NULL, NULL, 'active', 'private', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();
  db.prepare(
    `INSERT INTO project_members (id, project_id, user_id, display_name, role_code, is_owner, joined_at, created_at, updated_at)
     VALUES ('pm_owner', 'prj_1', 'usr_owner', '项目负责人', 'project_admin', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
            ('pm_member', 'prj_1', 'usr_member', '项目成员', 'member', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();
  db.prepare(
    `INSERT INTO project_modules (id, project_id, name, code, project_no, parent_id, node_type, owner_user_id, icon_code, priority, status, progress, enabled, sort, "desc", created_at, updated_at)
     VALUES ('mod_root', 'prj_1', '海区链路适配', 'M1', NULL, NULL, 'subsystem', NULL, NULL, 'medium', 'todo', 0, 1, 10, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
            ('mod_child', 'prj_1', '海区信息管理', 'M2', NULL, 'mod_root', 'module', NULL, NULL, 'medium', 'todo', 0, 1, 20, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();

  return db;
}

function createService(db: Database.Database) {
  const repo = new ProjectRepo(db);
  const authorization = new ProjectAuthorizationService(db, repo);
  const access = new ProjectAccessService(repo, authorization);
  return new ProjectService(repo, new UserRepo(db), new RdRepo(db), access, authorization, eventBus, db);
}

function ownerCtx() {
  return createRequestContext({ accountId: "adm_owner", userId: "usr_owner", roles: ["user"], source: "http" });
}

function memberCtx() {
  return createRequestContext({ accountId: "adm_member", userId: "usr_member", roles: ["user"], source: "http" });
}

describe("project feature progress", () => {
  it("returns a disabled empty view before the project enables feature progress", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const view = await service.getFeatureProgress("prj_1", memberCtx());

      assert.equal(view.enabled, false);
      assert.equal(view.summary.totalCount, 0);
      assert.deepEqual(view.modules, []);
    } finally {
      db.close();
    }
  });

  it("summarizes feature points and applies project-level manual override", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      await service.updateFeatureProgressSettings("prj_1", { enabled: true }, ownerCtx());
      await service.addFeaturePoint("prj_1", {
        name: "海区信息录入",
        moduleId: "mod_child",
        ownerUserId: "usr_owner",
        status: "done",
        progress: 100,
        sort: 10
      }, ownerCtx());
      await service.addFeaturePoint("prj_1", {
        name: "监管报表口径确认",
        status: "in_progress",
        progress: 50,
        sort: 20
      }, ownerCtx());

      let view = await service.getFeatureProgress("prj_1", memberCtx());
      assert.equal(view.enabled, true);
      assert.equal(view.summary.computedProgress, 75);
      assert.equal(view.summary.displayProgress, 75);
      assert.equal(view.modules[0]?.computedProgress, 100);
      assert.equal(view.ungrouped.computedProgress, 50);

      await service.upsertFeatureProgressOverride("prj_1", {
        targetType: "project",
        targetId: "prj_1",
        progress: 80,
        remark: "主管汇报口径"
      }, ownerCtx());
      view = await service.getFeatureProgress("prj_1", memberCtx());

      assert.equal(view.summary.computedProgress, 75);
      assert.equal(view.summary.overrideProgress, 80);
      assert.equal(view.summary.displayProgress, 80);
      assert.equal(view.summary.overrideRemark, "主管汇报口径");
    } finally {
      db.close();
    }
  });

  it("allows project members to read but not modify feature points", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      await service.updateFeatureProgressSettings("prj_1", { enabled: true }, ownerCtx());

      await assert.doesNotReject(() => service.getFeatureProgress("prj_1", memberCtx()));
      await assert.rejects(() =>
        service.addFeaturePoint("prj_1", { name: "无权限功能点", progress: 10 }, memberCtx())
      );
    } finally {
      db.close();
    }
  });
});
