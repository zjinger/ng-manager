import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { DashboardRepo } from "./dashboard.repo";
import { DashboardService } from "./dashboard.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE dashboard_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      dashboard_code TEXT NOT NULL DEFAULT 'home',
      layout_json TEXT NOT NULL DEFAULT '[]',
      stats_config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, dashboard_code)
    );

    CREATE TABLE system_roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE system_permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE
    );

    CREATE TABLE system_role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE user_system_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      UNIQUE (user_id, role_id)
    );

    CREATE TABLE reimbursement_approval_tasks (
      id TEXT PRIMARY KEY,
      assignee_user_id TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  db.prepare("INSERT INTO system_roles (id, code, name, status) VALUES (?, ?, ?, ?)")
    .run("srole_expense", "expense", "报销", "active");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)")
    .run("sperm_expense_submit", "expense.submit");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)")
    .run("sperm_project_create", "project.create");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)")
    .run("sperm_project_manage", "project.manage");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)")
    .run("sperm_approval_department", "approval.department");
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id) VALUES (?, ?)")
    .run("srole_expense", "sperm_expense_submit");

  return db;
}

function createService(db: Database.Database, projectIds: string[]) {
  const projectAccess = {
    listAccessibleProjectIds: async () => projectIds,
    requireProjectAccess: async () => undefined
  };
  return new DashboardService(
    projectAccess as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    new DashboardRepo(db),
    {} as never
  );
}

function ctx(userId = "usr_1") {
  return createRequestContext({
    accountId: "acc_1",
    userId,
    roles: ["user"],
    authType: "user",
    source: "cli"
  });
}

function grantExpenseRole(db: Database.Database, userId = "usr_1") {
  db.prepare("INSERT INTO user_system_roles (id, user_id, role_id) VALUES (?, ?, ?)")
    .run(`usr_expense_${userId}`, userId, "srole_expense");
}

function grantProjectPermissions(db: Database.Database, userId = "usr_1") {
  db.prepare("INSERT INTO system_roles (id, code, name, status) VALUES (?, ?, ?, ?)")
    .run("srole_project", "project_member", "项目成员", "active");
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id) VALUES (?, ?)")
    .run("srole_project", "sperm_project_create");
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id) VALUES (?, ?)")
    .run("srole_project", "sperm_project_manage");
  db.prepare("INSERT INTO user_system_roles (id, user_id, role_id) VALUES (?, ?, ?)")
    .run(`usr_project_${userId}`, userId, "srole_project");
}

function addPendingReimbursementTask(db: Database.Database, userId = "usr_1") {
  db.prepare("INSERT INTO reimbursement_approval_tasks (id, assignee_user_id, status) VALUES (?, ?, ?)")
    .run(`rat_${userId}`, userId, "pending");
}

describe("Dashboard preferences", () => {
  it("returns a reimbursement-first mixed default template", async () => {
    const db = createDb();
    grantExpenseRole(db);
    const service = createService(db, ["project_1"]);

    const preferences = await service.getPreferences(ctx());

    assert.equal(preferences.capabilities.isMixedWorkspaceUser, true);
    assert.equal(preferences.widgets.length, 6);
    assert.equal(preferences.widgets[0]?.key, "reimbursement.stats");
    assert.equal(preferences.widgets.some((item) => item.key === "collab.announcements"), true);
    assert.deepEqual(preferences.widgets.map((item) => item.order), [1, 2, 3, 4, 5, 6]);
  });

  it("saves normalized widget preferences and filters unavailable keys", async () => {
    const db = createDb();
    grantExpenseRole(db);
    const service = createService(db, []);

    const preferences = await service.updatePreferences(
      {
        widgets: [
          { key: "collab.todos", visible: true, order: 1 },
          { key: "reimbursement.stats", visible: false, order: 99 },
          { key: "collab.activities", visible: true, order: 2 },
          { key: "collab.activities", visible: false, order: 1 }
        ]
      },
      ctx()
    );

    assert.equal(preferences.capabilities.isReimbursementOnlyUser, true);
    assert.equal(preferences.widgets.some((item) => item.key === "collab.todos"), true);
    assert.equal(preferences.widgets.find((item) => item.key === "reimbursement.stats")?.visible, false);
    assert.equal(preferences.widgets.some((item) => item.key === "collab.announcements"), true);
    assert.deepEqual(preferences.widgets.map((item) => item.order), [1, 2, 3, 4]);

    const row = db.prepare("SELECT layout_json FROM dashboard_preferences WHERE user_id = ? AND dashboard_code = ?")
      .get("usr_1", "home") as { layout_json: string };
    assert.equal(JSON.parse(row.layout_json).some((item: { key: string }) => item.key === "collab.todos"), true);
  });

  it("does not show reimbursement stats by default for personal reimbursement-only users", async () => {
    const db = createDb();
    grantExpenseRole(db);
    const service = createService(db, []);

    const preferences = await service.getPreferences(ctx());
    const statsWidget = preferences.widgets.find((item) => item.key === "reimbursement.stats");

    assert.equal(statsWidget?.defaultVisible, false);
    assert.equal(statsWidget?.visible, false);
    assert.equal(preferences.widgets.some((item) => item.key === "collab.todos" && item.visible), true);
  });

  it("allows personal reimbursement-only users to manually show reimbursement stats", async () => {
    const db = createDb();
    grantExpenseRole(db);
    const service = createService(db, []);

    const preferences = await service.updatePreferences(
      {
        widgets: [
          { key: "reimbursement.stats", visible: true, order: 1 },
          { key: "collab.todos", visible: true, order: 2 }
        ]
      },
      ctx()
    );

    assert.equal(preferences.widgets.find((item) => item.key === "reimbursement.stats")?.defaultVisible, false);
    assert.equal(preferences.widgets.find((item) => item.key === "reimbursement.stats")?.visible, true);
  });

  it("shows reimbursement stats by default when the user has pending reimbursement approval tasks", async () => {
    const db = createDb();
    addPendingReimbursementTask(db);
    const service = createService(db, []);

    const preferences = await service.getPreferences(ctx());
    const statsWidget = preferences.widgets.find((item) => item.key === "reimbursement.stats");

    assert.equal(statsWidget?.defaultVisible, true);
    assert.equal(statsWidget?.visible, true);
  });

  it("returns only collaboration widgets for collaboration-only users", async () => {
    const db = createDb();
    const service = createService(db, ["project_1"]);

    const preferences = await service.getPreferences(ctx());

    assert.equal(preferences.capabilities.isCollaborationOnlyUser, true);
    assert.equal(preferences.widgets.every((item) => item.domain === "collab"), true);
  });

  it("treats project governance permissions as collaboration workspace access", async () => {
    const db = createDb();
    grantExpenseRole(db);
    grantProjectPermissions(db);
    const service = createService(db, []);

    const preferences = await service.getPreferences(ctx());

    assert.equal(preferences.capabilities.canAccessCollaborationWorkspace, true);
    assert.equal(preferences.capabilities.isMixedWorkspaceUser, true);
    assert.equal(preferences.widgets.some((item) => item.key === "collab.todos"), true);
    assert.equal(preferences.widgets.some((item) => item.key === "collab.issues"), true);
  });

  it("treats pending reimbursement approval tasks as reimbursement workspace access", async () => {
    const db = createDb();
    addPendingReimbursementTask(db);
    const service = createService(db, []);

    const preferences = await service.getPreferences(ctx());

    assert.equal(preferences.capabilities.canAccessReimbursementWorkspace, true);
    assert.equal(preferences.capabilities.isReimbursementOnlyUser, true);
    assert.equal(preferences.widgets.some((item) => item.key === "collab.todos"), true);
    assert.equal(preferences.widgets.some((item) => item.key === "reimbursement.stats"), true);
    assert.equal(preferences.widgets.some((item) => item.key === "collab.issues"), false);
  });
});
