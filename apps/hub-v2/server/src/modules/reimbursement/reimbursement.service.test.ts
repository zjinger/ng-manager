import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { ReimbursementRepo } from "./reimbursement.repo";
import { ReimbursementService } from "./reimbursement.service";
import { resolveTemplateType } from "./reimbursement-word-export";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      manager_user_id TEXT,
      finance_approver_user_id TEXT
    );
    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      manager_user_id TEXT
    );
    CREATE TABLE system_roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE system_permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL
    );
    CREATE TABLE system_role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL
    );
    CREATE TABLE user_system_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL
    );
    CREATE TABLE uploads (
      id TEXT PRIMARY KEY,
      file_name TEXT,
      original_name TEXT,
      mime_type TEXT,
      file_size INTEGER,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE approval_templates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE approval_template_stages (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      stage_code TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_type TEXT NOT NULL,
      resolver_type TEXT NOT NULL,
      resolver_ref TEXT,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE reimbursement_claims (
      id TEXT PRIMARY KEY,
      claim_no TEXT NOT NULL UNIQUE,
      claim_type TEXT NOT NULL,
      status TEXT NOT NULL,
      applicant_user_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      department_id TEXT NOT NULL,
      department_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      fill_date TEXT NOT NULL,
      travel_start_date TEXT,
      travel_start_half TEXT,
      travel_end_date TEXT,
      travel_end_half TEXT,
      travel_days REAL,
      receipt_count INTEGER,
      total_amount_cents INTEGER NOT NULL DEFAULT 0,
      advance_amount_cents INTEGER NOT NULL DEFAULT 0,
      balance_amount_cents INTEGER NOT NULL DEFAULT 0,
      current_stage_code TEXT,
      current_stage_name TEXT,
      submitted_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE reimbursement_items (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      category TEXT,
      description TEXT,
      occurred_date TEXT,
      start_date TEXT,
      end_date TEXT,
      from_location TEXT,
      to_location TEXT,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      meta_json TEXT,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE reimbursement_attachments (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      upload_id TEXT NOT NULL,
      category TEXT NOT NULL,
      created_by_user_id TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(claim_id, upload_id)
    );
    CREATE TABLE reimbursement_approval_tasks (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      template_stage_id TEXT,
      stage_code TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_type TEXT NOT NULL,
      resolver_type TEXT NOT NULL,
      resolver_ref TEXT,
      assignee_user_id TEXT NOT NULL,
      assignee_name TEXT NOT NULL,
      status TEXT NOT NULL,
      sort INTEGER NOT NULL,
      parent_task_id TEXT,
      transferred_from_task_id TEXT,
      comment TEXT,
      acted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE reimbursement_logs (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      actor_user_id TEXT,
      actor_name TEXT,
      action TEXT NOT NULL,
      task_id TEXT,
      comment TEXT,
      created_at TEXT NOT NULL
    );
  `);
  db.prepare("INSERT INTO users (id, username, display_name, status, manager_user_id, finance_approver_user_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run("usr_applicant", "applicant", "申请人", "active", "usr_manager", "usr_finance_approver");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_manager", "manager", "直属主管", "active");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_dept_manager", "dept", "部门负责人", "active");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_finance_approver", "finance", "财务审批人", "active");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_cashier", "cashier", "出纳", "active");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_other", "other", "无关人员", "active");
  db.prepare("INSERT INTO departments (id, name, status, manager_user_id) VALUES (?, ?, ?, ?)").run("dep_rd", "研发部", "active", "usr_dept_manager");
  db.prepare("INSERT INTO system_roles (id, code, status) VALUES (?, ?, ?)").run("srole_cashier", "finance_cashier", "active");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)").run("perm_submit", "expense.submit");
  db.prepare("INSERT INTO system_permissions (id, code) VALUES (?, ?)").run("perm_report", "expense.report.view");
  db.prepare("INSERT INTO system_role_permissions (role_id, permission_id) VALUES (?, ?)").run("srole_cashier", "perm_submit");
  db.prepare("INSERT INTO user_system_roles (id, user_id, role_id) VALUES (?, ?, ?)").run("usr_role_applicant", "usr_applicant", "srole_cashier");
  db.prepare("INSERT INTO user_system_roles (id, user_id, role_id) VALUES (?, ?, ?)").run("usr_role_cashier", "usr_cashier", "srole_cashier");
  db.prepare("INSERT INTO approval_templates (id, code, name, status) VALUES (?, ?, ?, ?)").run("tpl_expense", "expense_default", "默认报销审批", "active");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO approval_template_stages (id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("stg_direct", "tpl_expense", "direct", "直属主管", "direct_manager", "direct_manager", null, 10, now);
  db.prepare("INSERT INTO approval_template_stages (id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("stg_dept", "tpl_expense", "dept", "部门负责人", "department_manager", "department_manager", null, 20, now);
  db.prepare("INSERT INTO approval_template_stages (id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("stg_finance", "tpl_expense", "finance", "财务审批", "finance_review", "finance_approver", null, 30, now);
  db.prepare("INSERT INTO approval_template_stages (id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("stg_cashier", "tpl_expense", "cashier", "出纳", "cashier", "system_role", "srole_cashier", 40, now);
  db.prepare("INSERT INTO uploads (id, file_name, original_name, mime_type, file_size, status) VALUES (?, ?, ?, ?, ?, ?)")
    .run("upl_invoice", "invoice.pdf", "发票.pdf", "application/pdf", 1024, "active");
  return db;
}

function ctx(userId: string, roles: string[] = ["user"]) {
  return createRequestContext({
    accountId: `adm_${userId}`,
    userId,
    nickname: userId,
    roles,
    source: "http"
  });
}

describe("ReimbursementService", () => {
  it("creates, submits and approves through every configured stage", async () => {
    const db = createDb();
    try {
      const service = new ReimbursementService(new ReimbursementRepo(db));
      const created = await service.create(
        {
          claimType: "travel",
          departmentId: "dep_rd",
          reason: "客户现场支持",
          items: [{ amount: 100.25, description: "交通" }, { amount: 20, description: "餐费" }],
          advanceAmount: 10
        },
        ctx("usr_applicant")
      );
      assert.equal(created.totalAmount, 120.25);
      assert.equal(created.balanceAmount, 110.25);

      const submitted = await service.submit(created.id, ctx("usr_applicant"));
      assert.equal(submitted.status, "approving");
      assert.equal(submitted.tasks.filter((task) => task.status === "pending").length, 1);
      assert.equal(submitted.tasks.find((task) => task.status === "pending")?.assigneeUserId, "usr_manager");

      let detail = await service.approve(submitted.id, { taskId: submitted.tasks.find((task) => task.status === "pending")!.id }, ctx("usr_manager"));
      assert.equal(detail.tasks.find((task) => task.status === "pending")?.assigneeUserId, "usr_dept_manager");

      detail = await service.approve(detail.id, { taskId: detail.tasks.find((task) => task.status === "pending")!.id }, ctx("usr_dept_manager"));
      assert.equal(detail.tasks.find((task) => task.status === "pending")?.assigneeUserId, "usr_finance_approver");

      detail = await service.approve(detail.id, { taskId: detail.tasks.find((task) => task.status === "pending")!.id }, ctx("usr_finance_approver"));
      const cashierTasks = detail.tasks.filter((task) => task.status === "pending");
      assert.equal(cashierTasks.length, 2);

      detail = await service.approve(detail.id, { taskId: cashierTasks.find((task) => task.assigneeUserId === "usr_cashier")!.id }, ctx("usr_cashier"));
      assert.equal(detail.status, "completed");
      assert.equal(detail.tasks.some((task) => task.status === "cancelled" && task.assigneeUserId === "usr_applicant"), true);
    } finally {
      db.close();
    }
  });

  it("rejects non-assignee approval and supports reject then edit", async () => {
    const db = createDb();
    try {
      const service = new ReimbursementService(new ReimbursementRepo(db));
      const created = await service.create(
        { claimType: "general", departmentId: "dep_rd", reason: "办公用品", items: [{ amount: 30 }] },
        ctx("usr_applicant")
      );
      const submitted = await service.submit(created.id, ctx("usr_applicant"));
      const task = submitted.tasks.find((item) => item.status === "pending")!;
      await assert.rejects(() => service.approve(submitted.id, { taskId: task.id }, ctx("usr_other")), /assignee mismatch/);

      const rejected = await service.reject(submitted.id, { taskId: task.id, comment: "补充票据" }, ctx("usr_manager"));
      assert.equal(rejected.status, "rejected");
      const updated = await service.update(rejected.id, { reason: "办公用品采购", items: [{ amount: 40 }] }, ctx("usr_applicant"));
      assert.equal(updated.status, "draft");
      assert.equal(updated.totalAmount, 40);
    } finally {
      db.close();
    }
  });

  it("supports attachments, transfer and add-sign", async () => {
    const db = createDb();
    try {
      const service = new ReimbursementService(new ReimbursementRepo(db));
      const created = await service.create(
        { claimType: "general", departmentId: "dep_rd", reason: "付款证明", items: [{ amount: 90 }] },
        ctx("usr_applicant")
      );
      const withAttachment = await service.attach(created.id, { uploadId: "upl_invoice", category: "invoice" }, ctx("usr_applicant"));
      assert.equal(withAttachment.attachments.length, 1);

      let submitted = await service.submit(created.id, ctx("usr_applicant"));
      const task = submitted.tasks.find((item) => item.status === "pending")!;
      submitted = await service.transfer(submitted.id, { taskId: task.id, targetUserId: "usr_other" }, ctx("usr_manager"));
      assert.equal(submitted.tasks.find((item) => item.status === "pending")?.assigneeUserId, "usr_other");

      submitted = await service.addSign(
        submitted.id,
        { taskId: submitted.tasks.find((item) => item.status === "pending")!.id, targetUserId: "usr_manager" },
        ctx("usr_other")
      );
      assert.equal(submitted.tasks.some((item) => item.status === "addsign_pending" && item.assigneeUserId === "usr_manager"), true);
    } finally {
      db.close();
    }
  });

  it("exports travel and general claims as docx using balance template type", async () => {
    assert.equal(resolveTemplateType(0), "0");
    assert.equal(resolveTemplateType(12.3), "1");
    assert.equal(resolveTemplateType(-12.3), "2");

    const db = createDb();
    try {
      const service = new ReimbursementService(new ReimbursementRepo(db));
      const travel = await service.create(
        {
          claimType: "travel",
          departmentId: "dep_rd",
          reason: "客户现场支持",
          advanceAmount: 50,
          items: [
            {
              amount: 120,
              category: "交通",
              description: "交通",
              startDate: "2026-05-01",
              endDate: "2026-05-03",
              fromLocation: "深圳",
              toLocation: "上海",
              meta: { taxi: 120, days: 3 }
            }
          ]
        },
        ctx("usr_applicant")
      );
      const travelFile = await service.exportWord(travel.id, ctx("usr_applicant"));
      assert.equal(travelFile.templateType, "1");
      assert.equal(travelFile.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      assert.equal(travelFile.buffer.subarray(0, 2).toString(), "PK");
      assert.match(travelFile.fileName, /差旅费报销单\.docx$/);

      const general = await service.create(
        {
          claimType: "general",
          departmentId: "dep_rd",
          reason: "办公用品",
          advanceAmount: 80,
          items: [{ amount: 30, description: "打印纸" }]
        },
        ctx("usr_applicant")
      );
      const generalFile = await service.exportWord(general.id, ctx("usr_applicant"));
      assert.equal(generalFile.templateType, "2");
      assert.equal(generalFile.buffer.subarray(0, 2).toString(), "PK");
      assert.match(generalFile.fileName, /费用报销单\.docx$/);
    } finally {
      db.close();
    }
  });

  it("rejects export when the user cannot read the claim", async () => {
    const db = createDb();
    try {
      const service = new ReimbursementService(new ReimbursementRepo(db));
      const created = await service.create(
        { claimType: "general", departmentId: "dep_rd", reason: "办公用品", items: [{ amount: 30 }] },
        ctx("usr_applicant")
      );
      await assert.rejects(() => service.exportWord(created.id, ctx("usr_other")), /forbidden/);
    } finally {
      db.close();
    }
  });
});
