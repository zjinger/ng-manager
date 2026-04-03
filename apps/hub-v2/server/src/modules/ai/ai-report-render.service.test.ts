import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { AiReportRenderService } from "./ai-report-render.service";

describe("AiReportRenderService category preference", () => {
  it("prefers project_name over project_id for chart and leaderboard labels", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE report_data (
          project_id TEXT,
          project_name TEXT,
          date TEXT,
          created_count INTEGER,
          closed_count INTEGER
        );
      `);

      db.prepare(
        "INSERT INTO report_data (project_id, project_name, date, created_count, closed_count) VALUES (?, ?, ?, ?, ?)"
      ).run("prj_aaa111", "项目A", "2026-04-01", 3, 1);
      db.prepare(
        "INSERT INTO report_data (project_id, project_name, date, created_count, closed_count) VALUES (?, ?, ?, ?, ?)"
      ).run("prj_bbb222", "项目B", "2026-04-01", 2, 2);

      const service = new AiReportRenderService(db);
      const blocks = service.executeAndRenderAll(
        "SELECT project_id, project_name, date, created_count, closed_count FROM report_data",
        []
      );

      const distribution = blocks.find((block) => block.type === "distribution_chart");
      assert.ok(distribution?.chart, "distribution chart should exist");
      assert.deepEqual(distribution.chart?.labels, ["项目A", "项目B"]);

      const leaderboard = blocks.find((block) => block.type === "leaderboard");
      assert.ok(leaderboard?.items, "leaderboard should exist");
      assert.deepEqual(
        leaderboard.items?.map((item) => item.label),
        ["项目A", "项目B"]
      );
    } finally {
      db.close();
    }
  });
});
