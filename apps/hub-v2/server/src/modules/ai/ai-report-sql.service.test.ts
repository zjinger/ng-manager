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

  return new AiReportSqlService(config, projectAccess);
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
});
