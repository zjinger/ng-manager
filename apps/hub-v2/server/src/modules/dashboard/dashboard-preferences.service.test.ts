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
    .run("sperm_expense_review_manage", "expense.review.manage");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)")
    .run("sperm_expense_rule_manage", "expense.rule.manage");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)")
    .run("sperm_finance_review", "finance.review");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)")
    .run("sperm_finance_cashier", "finance.cashier");
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
    .run("srole_project", "sperm_project_manage");
  db.prepare("INSERT INTO user_system_roles (id, user_id, role_id) VALUES (?, ?, ?)")
    .run(`usr_project_${userId}`, userId, "srole_project");
}

function grantRoleWithPermissions(db: Database.Database, roleCode: string, permissionIds: string[], userId = "usr_1") {
  const roleId = `srole_${roleCode}`;
  db.prepare("INSERT INTO system_roles (id, code, name, status) VALUES (?, ?, ?, ?)")
    .run(roleId, roleCode, roleCode, "active");
  const insertRolePermission = db.prepare("INSERT INTO system_role_permissions (role_id, permission_id) VALUES (?, ?)");
  for (const permissionId of permissionIds) {
    insertRolePermission.run(roleId, permissionId);
  }
  db.prepare("INSERT INTO user_system_roles (id, user_id, role_id) VALUES (?, ?, ?)")
    .run(`usr_${roleCode}_${userId}`, userId, roleId);
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
    assert.deepEqual(
      preferences.shortcuts.map((item) => item.key),
      [
        "collab.issueCreate",
        "collab.rdCreate",
        "collab.content",
        "collab.feedbacks",
        "collab.profile",
        "reimbursement.travelExpense",
        "reimbursement.generalExpense",
        "reimbursement.myExpenses"
      ]
    );
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
    const layout = JSON.parse(row.layout_json) as { widgets: Array<{ key: string }>; shortcuts: Array<{ key: string }> };
    assert.equal(layout.widgets.some((item) => item.key === "collab.todos"), true);
    assert.equal(layout.shortcuts.every((item) => item.key.startsWith("reimbursement.")), true);
  });

  it("keeps old array layout as widgets and uses default shortcuts", async () => {
    const db = createDb();
    grantExpenseRole(db);
    const service = createService(db, []);
    db.prepare(`
      INSERT INTO dashboard_preferences (id, user_id, dashboard_code, layout_json, stats_config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "dpf_old_array",
      "usr_1",
      "home",
      JSON.stringify([
        { key: "collab.todos", visible: false, order: 2 },
        { key: "reimbursement.stats", visible: true, order: 1 }
      ]),
      "{}",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    );

    const preferences = await service.getPreferences(ctx());

    assert.equal(preferences.widgets.find((item) => item.key === "collab.todos")?.visible, false);
    assert.deepEqual(
      preferences.shortcuts.map((item) => item.key),
      ["reimbursement.travelExpense", "reimbursement.generalExpense", "reimbursement.myExpenses"]
    );
  });

  it("only returns reimbursement management shortcut for management or finance users", async () => {
    const db = createDb();
    grantExpenseRole(db, "usr_basic");
    grantRoleWithPermissions(db, "expense_manager", ["sperm_expense_review_manage"], "usr_manager");
    const service = createService(db, []);

    const basic = await service.getPreferences(ctx("usr_basic"));
    const manager = await service.getPreferences(ctx("usr_manager"));

    assert.equal(basic.shortcuts.some((item) => item.key === "reimbursement.management"), false);
    assert.equal(manager.shortcuts.some((item) => item.key === "reimbursement.management"), true);
  });

  it("saves normalized shortcut preferences and filters unavailable shortcut keys", async () => {
    const db = createDb();
    grantExpenseRole(db);
    const service = createService(db, []);

    const preferences = await service.updatePreferences(
      {
        widgets: [
          { key: "collab.todos", visible: true, order: 1 },
          { key: "reimbursement.stats", visible: false, order: 2 }
        ],
        shortcuts: [
          { key: "collab.issueCreate", visible: true, order: 1 },
          { key: "reimbursement.myExpenses", visible: false, order: 99 },
          { key: "reimbursement.travelExpense", visible: true, order: 2 },
          { key: "reimbursement.travelExpense", visible: false, order: 1 }
        ]
      },
      ctx()
    );

    assert.equal(preferences.shortcuts.some((item) => item.key === "collab.issueCreate"), false);
    assert.equal(preferences.shortcuts.find((item) => item.key === "reimbursement.myExpenses")?.visible, false);
    assert.deepEqual(preferences.shortcuts.map((item) => item.order), [1, 2, 3]);

    const reloaded = await service.getPreferences(ctx());
    assert.equal(reloaded.shortcuts.find((item) => item.key === "reimbursement.myExpenses")?.visible, false);
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
