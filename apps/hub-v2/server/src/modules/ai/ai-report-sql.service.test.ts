import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RequestContext } from "../../shared/context/request-context";
import type { AppConfig } from "../../shared/env/env";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { AiReportSqlService } from "./ai-report-sql.service";

const ctx: RequestContext = {
  accountId: "u_test",
  authType: "user",
  roles: [],
  source: "http"
};

function createService(projectIds: string[]): AiReportSqlService {
  const config = {
    openaiApiKey: null,
    openaiBaseUrl: null
  } as unknown as AppConfig;

  const projectAccess: ProjectAccessContract = {
    async listAccessibleProjectIds() {
      return projectIds;
    },
    async requireProjectAccess() {
      return;
    },
    async requireProjectMember() {
      throw new Error("not used in this test");
    }
  };

  return new AiReportSqlService(config, null, projectAccess);
}

describe("AiReportSqlService project filter binding", () => {
  it("replaces existing projects.id IN placeholders without injecting duplicate filter", async () => {
    const service = createService(["p1", "p2", "p3"]);
    const rawSql =
      "SELECT p.name, COUNT(pm.user_id) AS member_count FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id WHERE p.id IN (?) GROUP BY p.id, p.name";

    const prepared = await service.prepareSqlForExecution(rawSql, ctx);

    assert.deepEqual(prepared.params, ["p1", "p2", "p3"]);
    assert.match(prepared.sql, /\bp\.id\s+IN\s*\(\?, \?, \?\)/i);
    assert.equal((prepared.sql.match(/\bp\.id\s+IN\s*\(/gi) ?? []).length, 1);
    assert.equal((prepared.sql.match(/\?/g) ?? []).length, prepared.params.length);
  });

  it("injects projects.id filter when query has no project filter", async () => {
    const service = createService(["a1", "a2"]);
    const rawSql =
      "SELECT p.name, COUNT(pm.user_id) AS member_count FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id GROUP BY p.id, p.name ORDER BY member_count DESC";

    const prepared = await service.prepareSqlForExecution(rawSql, ctx);

    assert.deepEqual(prepared.params, ["a1", "a2"]);
    assert.match(prepared.sql, /\bWHERE\s+p\.id\s+IN\s*\(\?, \?\)\s+GROUP\s+BY\b/i);
    assert.equal((prepared.sql.match(/\?/g) ?? []).length, prepared.params.length);
  });

  it("keeps legacy project_id IN replacement behavior", async () => {
    const service = createService(["x1", "x2"]);
    const rawSql =
      "SELECT i.project_id, COUNT(*) AS issue_count FROM issues i WHERE i.project_id IN (?) GROUP BY i.project_id";

    const prepared = await service.prepareSqlForExecution(rawSql, ctx);

    assert.deepEqual(prepared.params, ["x1", "x2"]);
    assert.match(prepared.sql, /\bi\.project_id\s+IN\s*\(\?, \?\)/i);
    assert.equal((prepared.sql.match(/\bi\.project_id\s+IN\s*\(/gi) ?? []).length, 1);
    assert.equal((prepared.sql.match(/\?/g) ?? []).length, prepared.params.length);
  });

  it("injects top-level project filter when subquery already contains WHERE", async () => {
    const service = createService(["t1", "t2"]);
    const rawSql =
      "SELECT p.id as project_id, p.name as project_name, d.date as date " +
      "FROM projects p " +
      "JOIN (SELECT DATE(i.created_at) as date FROM issues i WHERE i.type = 'test') d ON 1 = 1 " +
      "ORDER BY d.date DESC";

    const prepared = await service.prepareSqlForExecution(rawSql, ctx);

    assert.deepEqual(prepared.params, ["t1", "t2"]);
    assert.match(prepared.sql, /\bi\.type\s*=\s*'test'/i);
    assert.match(prepared.sql, /\bON\s+1\s*=\s*1\s+WHERE\s+p\.id\s+IN\s*\(\?, \?\)\s+ORDER\s+BY\b/i);
    assert.equal((prepared.sql.match(/\bp\.id\s+IN\s*\(/gi) ?? []).length, 1);
    assert.equal((prepared.sql.match(/\?/g) ?? []).length, prepared.params.length);
  });

  it("wraps existing WHERE expression when injecting filter to avoid OR precedence leak", async () => {
    const service = createService(["p_active"]);
    const rawSql =
      "SELECT i.id, i.project_id FROM issues i WHERE i.status = 'closed' OR i.status = 'verified' ORDER BY i.created_at DESC";

    const prepared = await service.prepareSqlForExecution(rawSql, ctx);

    assert.deepEqual(prepared.params, ["p_active"]);
    assert.match(
      prepared.sql,
      /\bWHERE\s+i\.project_id\s+IN\s*\(\?\)\s+AND\s+\(i\.status\s*=\s*'closed'\s+OR\s+i\.status\s*=\s*'verified'\)\s+ORDER\s+BY\b/i,
    );
  });

  it("uses member handled preset with resolved/verified/closed time windows and no test-type restriction", async () => {
    const service = createService(["m1", "m2"]);

    const result = await service.generateSql("成员维度：最近 30 天谁处理的测试单最多", ctx);

    assert.deepEqual(result.params, ["m1", "m2"]);
    assert.match(result.sql, /\bi\.status\s+IN\s*\('resolved',\s*'verified',\s*'closed'\)/i);
    assert.match(result.sql, /\bi\.resolved_at\s+IS\s+NOT\s+NULL/i);
    assert.match(result.sql, /\bi\.verified_at\s+IS\s+NOT\s+NULL/i);
    assert.match(result.sql, /\bi\.closed_at\s+IS\s+NOT\s+NULL/i);
    assert.doesNotMatch(result.sql, /\bi\.type\s*=\s*'test'/i);
    assert.equal(result.title, "成员处理数量排行");
  });

  it("uses project member count preset for member compare query", async () => {
    const service = createService(["p1", "p2"]);

    const result = await service.generateSql("各项目当前成员数量对比", ctx);

    assert.deepEqual(result.params, ["p1", "p2"]);
    assert.match(result.sql, /\bFROM\s+projects\s+p\b/i);
    assert.match(result.sql, /\bLEFT\s+JOIN\s+project_members\s+pm\s+ON\s+pm\.project_id\s*=\s*p\.id\b/i);
    assert.match(result.sql, /\bCOUNT\(pm\.id\)\s+as\s+member_count\b/i);
    assert.equal(result.title, "各项目当前成员数量对比");
  });
});
