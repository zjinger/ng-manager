import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { ProjectAccessService } from "../project/project-access.service";
import { ProjectAuthorizationService } from "../project/project-authorization.service";
import { ProjectRepo } from "../project/project.repo";
import { DeliveryWeeklyReportRepo } from "./delivery-weekly-report.repo";
import { DeliveryWeeklyReportService } from "./delivery-weekly-report.service";
import type { DeliveryWeeklyReportSnapshotPayload } from "./delivery-weekly-report.types";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
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
      created_at TEXT NOT NULL
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
    CREATE TABLE delivery_weekly_reports (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_key TEXT NOT NULL,
      project_name TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      title TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      stages_json TEXT NOT NULL,
      key_items_json TEXT NOT NULL,
      attentions_json TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      created_by_name TEXT,
      created_at TEXT NOT NULL
    );
  `);
  db.prepare(
    `INSERT INTO projects (id, project_key, project_no, display_code, name, description, icon, avatar_upload_id, project_type, contract_no, delivery_date, product_line, sla_level, status, visibility, created_at, updated_at)
     VALUES ('prj_1', 'PRJ', 'P001', 'P001', '测试项目', NULL, NULL, NULL, 'self_dev', NULL, NULL, NULL, NULL, 'active', 'private', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();
  db.prepare(
    `INSERT INTO project_members (id, project_id, user_id, display_name, role_code, is_owner, joined_at, created_at, updated_at)
     VALUES ('pm_owner', 'prj_1', 'usr_owner', '负责人', 'project_admin', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
            ('pm_member', 'prj_1', 'usr_member', '成员', 'member', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();
  return db;
}

function createService(db: Database.Database) {
  const projectRepo = new ProjectRepo(db);
  const authorization = new ProjectAuthorizationService(db, projectRepo);
  const projectAccess = new ProjectAccessService(projectRepo, authorization);
  return new DeliveryWeeklyReportService(new DeliveryWeeklyReportRepo(db), projectRepo, projectAccess);
}

function payload(): DeliveryWeeklyReportSnapshotPayload {
  return {
    projectId: "prj_1",
    projectKey: "PRJ",
    projectName: "测试项目",
    periodStart: "2026-05-25",
    periodEnd: "2026-05-31",
    title: "测试项目-周报",
    summary: [{ title: "本周进展", content: "完成登录模块" }],
    metrics: [{ label: "已完成", value: 1 }],
    stages: [],
    keyItems: [],
    attentions: []
  };
}

function ownerCtx() {
  return createRequestContext({
    accountId: "adm_owner",
    userId: "usr_owner",
    nickname: "负责人",
    roles: ["user"],
    source: "http"
  });
}

function memberCtx() {
  return createRequestContext({
    accountId: "adm_member",
    userId: "usr_member",
    nickname: "成员",
    roles: ["user"],
    source: "http"
  });
}

describe("delivery weekly report service", () => {
  it("allows project owner to create a weekly report snapshot", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const created = await service.create(payload(), ownerCtx());
      assert.equal(created.projectId, "prj_1");
      assert.equal(created.projectKey, "PRJ");
      assert.equal(created.createdById, "usr_owner");
      assert.deepEqual(created.summary, [{ title: "本周进展", content: "完成登录模块" }]);
    } finally {
      db.close();
    }
  });

  it("rejects regular project member when creating a weekly report snapshot", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      await assert.rejects(() => service.create(payload(), memberCtx()), /project admin only/);
    } finally {
      db.close();
    }
  });

  it("lists snapshots for users with project access", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      await service.create(payload(), ownerCtx());
      const result = await service.list({ projectId: "prj_1", page: 1, pageSize: 10 }, memberCtx());
      assert.equal(result.total, 1);
      assert.equal(result.items[0]?.projectName, "测试项目");
    } finally {
      db.close();
    }
  });

  it("allows project owner to delete a weekly report snapshot", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const created = await service.create(payload(), ownerCtx());
      const deleted = await service.delete(created.id, ownerCtx());
      assert.equal(deleted.id, created.id);
      const result = await service.list({ projectId: "prj_1", page: 1, pageSize: 10 }, ownerCtx());
      assert.equal(result.total, 0);
    } finally {
      db.close();
    }
  });

  it("rejects regular project member when deleting a weekly report snapshot", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const created = await service.create(payload(), ownerCtx());
      await assert.rejects(() => service.delete(created.id, memberCtx()), /project admin only/);
      const result = await service.list({ projectId: "prj_1", page: 1, pageSize: 10 }, ownerCtx());
      assert.equal(result.total, 1);
    } finally {
      db.close();
    }
  });
});
