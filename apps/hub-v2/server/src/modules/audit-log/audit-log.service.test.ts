import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { AuditLogRepo } from "./audit-log.repo";
import { AuditLogService } from "./audit-log.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE admin_audit_logs (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      actor_id TEXT,
      actor_name TEXT,
      actor_user_id TEXT,
      target_type TEXT,
      target_id TEXT,
      target_name TEXT,
      summary TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      request_id TEXT,
      before_json TEXT,
      after_json TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

function createService(db = createDb()) {
  return new AuditLogService(new AuditLogRepo(db));
}

function ctx() {
  return createRequestContext({
    accountId: "adm_1",
    userId: "usr_1",
    nickname: "管理员",
    roles: ["admin"],
    authScopes: ["admin.audit.view"],
    source: "http",
    ip: "10.0.0.1",
    userAgent: "node-test",
    requestId: "req_1"
  });
}

describe("AuditLogService", () => {
  it("records sanitized audit logs", () => {
    const service = createService();
    service.record(
      {
        module: "user",
        action: "reset",
        targetType: "user",
        targetId: "usr_2",
        targetName: "测试用户",
        summary: "重置用户密码",
        before: { username: "demo", passwordHash: "old" },
        after: { username: "demo", apiToken: "new" },
        meta: { plainSecret: "hidden", visible: "ok" }
      },
      ctx()
    );

    const result = service.list({ page: 1, pageSize: 20 });
    assert.equal(result.total, 1);
    assert.equal(result.items[0].actorName, "管理员");
    assert.equal(result.items[0].ip, "10.0.0.1");
    assert.match(result.items[0].beforeJson ?? "", /\[REDACTED\]/);
    assert.doesNotMatch(result.items[0].afterJson ?? "", /new/);
    assert.match(result.items[0].metaJson ?? "", /"visible":"ok"/);
  });

  it("filters by keyword, module, action, level, actor, and date range", () => {
    const service = createService();
    const baseCtx = ctx();
    service.record(
      {
        module: "role",
        action: "assign",
        targetType: "system_role",
        targetId: "role_1",
        targetName: "项目经理",
        summary: "更新角色「项目经理」的权限配置"
      },
      baseCtx
    );
    service.record(
      {
        module: "settings",
        action: "update",
        level: "warn",
        targetType: "system_settings",
        targetId: "security",
        targetName: "安全设置",
        summary: "更新安全设置"
      },
      { ...baseCtx, accountId: "adm_2", userId: "usr_2", nickname: "安全管理员" }
    );

    const roleResult = service.list({
      keyword: "项目经理",
      module: "role",
      action: "assign",
      level: "info",
      actorId: "usr_1",
      dateFrom: "2000-01-01T00:00:00.000Z",
      dateTo: "2999-01-01T00:00:00.000Z"
    });
    assert.equal(roleResult.total, 1);
    assert.equal(roleResult.items[0].module, "role");

    const warnResult = service.list({ level: "warn", actorId: "adm_2" });
    assert.equal(warnResult.total, 1);
    assert.equal(warnResult.items[0].targetId, "security");
  });

  it("paginates audit logs", () => {
    const service = createService();
    for (let index = 0; index < 3; index += 1) {
      service.record(
        {
          module: "title",
          action: "create",
          targetType: "system_title",
          targetId: `title_${index}`,
          targetName: `职务 ${index}`,
          summary: `创建职务 ${index}`
        },
        ctx()
      );
    }

    const firstPage = service.list({ page: 1, pageSize: 2 });
    const secondPage = service.list({ page: 2, pageSize: 2 });
    assert.equal(firstPage.total, 3);
    assert.equal(firstPage.items.length, 2);
    assert.equal(secondPage.items.length, 1);
  });
});
