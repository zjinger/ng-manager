import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { RdRepo } from "./rd.repo";

describe("RdRepo dashboard todo and progress upsert", () => {
  it("prefers rd_verify when same item matches assigned and verify todo", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE rd_items (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          rd_no TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          assignee_id TEXT,
          member_ids TEXT,
          verifier_id TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      const repo = new RdRepo(db);
      db.prepare(`
        INSERT INTO rd_items (id, project_id, rd_no, title, status, assignee_id, member_ids, verifier_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "rdi_1",
        "p1",
        "RD-000001",
        "待验证优先级回归",
        "done",
        "u1",
        JSON.stringify(["u1"]),
        "u1",
        "2026-04-18T13:00:00.000Z"
      );

      const todos = repo.listTodosForDashboard(["p1"], "u1", 10);
      assert.equal(todos.length, 1);
      assert.equal(todos[0]?.entityId, "rdi_1");
      assert.equal(todos[0]?.kind, "rd_verify");
    } finally {
      db.close();
    }
  });

  it("upsertProgress keeps one row for same item and user", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE rd_item_progress (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          progress INTEGER NOT NULL,
          note TEXT,
          updated_at TEXT NOT NULL,
          UNIQUE (item_id, user_id)
        );
      `);

      const repo = new RdRepo(db);
      repo.upsertProgress({
        id: "rdp_1",
        item_id: "rdi_1",
        user_id: "u1",
        progress: 20,
        note: "first",
        updated_at: "2026-04-18T12:00:00.000Z",
      });
      repo.upsertProgress({
        id: "rdp_2",
        item_id: "rdi_1",
        user_id: "u1",
        progress: 70,
        note: "second",
        updated_at: "2026-04-18T12:30:00.000Z",
      });

      const rows = db
        .prepare("SELECT id, progress, note FROM rd_item_progress WHERE item_id = ? AND user_id = ?")
        .all("rdi_1", "u1") as Array<{ id: string; progress: number; note: string | null }>;

      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.id, "rdp_1");
      assert.equal(rows[0]?.progress, 70);
      assert.equal(rows[0]?.note, "second");
    } finally {
      db.close();
    }
  });
});

