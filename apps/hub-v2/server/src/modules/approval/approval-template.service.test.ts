import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { ApprovalTemplateRepo } from "./approval-template.repo";
import { ApprovalTemplateService } from "./approval-template.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE system_roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE approval_templates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(template_id, stage_code)
    );
  `);
  db.prepare("INSERT INTO system_roles (id, code, name, status) VALUES (?, ?, ?, ?)").run("srole_finance_reviewer", "finance_reviewer", "财务复核", "active");
  return db;
}

const adminCtx = createRequestContext({
  accountId: "adm_1",
  userId: "usr_admin",
  roles: ["admin"],
  source: "http"
});

describe("ApprovalTemplateService", () => {
  it("creates approval template with configured stages", async () => {
    const db = createDb();
    try {
      const service = new ApprovalTemplateService(new ApprovalTemplateRepo(db));
      const template = await service.create(
        {
          code: "expense_default",
          name: "默认报销审批",
          stages: [
            {
              stageCode: "direct_manager",
              stageName: "直属主管",
              stageType: "direct_manager",
              resolverType: "direct_manager"
            },
            {
              stageCode: "finance_review",
              stageName: "财务复核",
              stageType: "finance_review",
              resolverType: "system_role",
              resolverRef: "srole_finance_reviewer"
            }
          ]
        },
        adminCtx
      );

      assert.equal(template.code, "expense_default");
      assert.equal(template.stages.length, 2);
      assert.equal(template.stages[1].resolverRef, "srole_finance_reviewer");
    } finally {
      db.close();
    }
  });

  it("rejects system role resolver without a valid role", async () => {
    const db = createDb();
    try {
      const service = new ApprovalTemplateService(new ApprovalTemplateRepo(db));
      await assert.rejects(
        () =>
          service.create(
            {
              code: "invalid",
              name: "非法模板",
              stages: [
                {
                  stageCode: "finance_review",
                  stageName: "财务复核",
                  stageType: "finance_review",
                  resolverType: "system_role",
                  resolverRef: "missing_role"
                }
              ]
            },
            adminCtx
          ),
        /system role not found/
      );
    } finally {
      db.close();
    }
  });

  it("rejects resolverRef for non system role resolvers", async () => {
    const db = createDb();
    try {
      const service = new ApprovalTemplateService(new ApprovalTemplateRepo(db));
      await assert.rejects(
        () =>
          service.create(
            {
              code: "invalid_ref",
              name: "非法引用",
              stages: [
                {
                  stageCode: "direct_manager",
                  stageName: "直属主管",
                  stageType: "direct_manager",
                  resolverType: "direct_manager",
                  resolverRef: "srole_finance_reviewer"
                }
              ]
            },
            adminCtx
          ),
        /resolverRef is only supported/
      );
    } finally {
      db.close();
    }
  });
});
