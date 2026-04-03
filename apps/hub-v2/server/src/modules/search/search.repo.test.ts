import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { SearchRepo } from "./search.repo";

describe("SearchRepo chinese substring fallback", () => {
  it("matches Chinese keyword inside mixed-language token", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE VIRTUAL TABLE global_search_fts USING fts5 (
          entity_type UNINDEXED,
          entity_id UNINDEXED,
          project_id UNINDEXED,
          title,
          body,
          updated_at UNINDEXED,
          tokenize = 'unicode61'
        );
      `);

      const insert = db.prepare(`
        INSERT INTO global_search_fts (
          entity_type,
          entity_id,
          project_id,
          title,
          body,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      insert.run("rd", "rd_1", "p1", "AI积木报表优化", "研发项描述", "2026-04-03T10:00:00.000Z");
      insert.run("rd", "rd_2", "p1", "积木功能升级", "研发项描述", "2026-04-03T10:01:00.000Z");
      insert.run("rd", "rd_3", "p1", "搜索能力升级", "研发项描述", "2026-04-03T10:02:00.000Z");

      const repo = new SearchRepo(db);
      const result = repo.search({
        matchExpression: "\"积木\"*",
        rawKeyword: "积木",
        projectIds: ["p1"],
        includeGlobalProjectNull: false,
        globalProjectNullPublishedOnly: false,
        types: ["rd"],
        limit: 20
      });

      const ids = result.items.map((item) => item.entityId);
      assert.ok(ids.includes("rd_1"), "should include mixed-language title row");
      assert.ok(ids.includes("rd_2"), "should include normal Chinese title row");
      assert.ok(!ids.includes("rd_3"), "should not include unrelated row");
      assert.equal(result.total, 2);
    } finally {
      db.close();
    }
  });
});
