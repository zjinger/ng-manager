import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { IssueRepo } from "./issue.repo";
import type { IssueEntity } from "./issue.types";

describe("IssueRepo list keyword filter", () => {
  it("matches reporter keyword", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE issues (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          issue_no TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          priority TEXT NOT NULL,
          reporter_id TEXT NOT NULL,
          reporter_name TEXT NOT NULL,
          assignee_id TEXT,
          assignee_name TEXT,
          verifier_id TEXT,
          verifier_name TEXT,
          module_code TEXT,
          version_code TEXT,
          environment_code TEXT,
          resolution_summary TEXT,
          close_reason TEXT,
          close_remark TEXT,
          reopen_count INTEGER NOT NULL DEFAULT 0,
          started_at TEXT,
          resolved_at TEXT,
          verified_at TEXT,
          closed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE issue_participants (
          id TEXT PRIMARY KEY,
          issue_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      const repo = new IssueRepo(db);
      const now = "2026-04-09T08:00:00.000Z";
      const buildIssue = (input: Partial<IssueEntity> & Pick<IssueEntity, "id" | "issueNo" | "reporterId" | "reporterName">): IssueEntity => ({
        id: input.id,
        projectId: "p1",
        issueNo: input.issueNo,
        title: input.title ?? "列表筛选回归",
        description: input.description ?? "仅用于测试关键字筛选",
        type: "bug",
        status: "open",
        priority: "medium",
        reporterId: input.reporterId,
        reporterName: input.reporterName,
        assigneeId: null,
        assigneeName: null,
        verifierId: null,
        verifierName: null,
        moduleCode: null,
        versionCode: null,
        environmentCode: null,
        resolutionSummary: null,
        closeReason: null,
        closeRemark: null,
        reopenCount: 0,
        startedAt: null,
        resolvedAt: null,
        verifiedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      repo.create(buildIssue({ id: "iss_1", issueNo: "PRJ-BUG-0001", reporterId: "usr_zhao", reporterName: "赵晴" }));
      repo.create(buildIssue({ id: "iss_2", issueNo: "PRJ-BUG-0002", reporterId: "usr_wang", reporterName: "王雯" }));

      const result = repo.list({
        projectId: "p1",
        keyword: "赵晴",
        page: 1,
        pageSize: 20,
      });

      assert.equal(result.total, 1);
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0]?.id, "iss_1");
      assert.equal(result.items[0]?.reporterName, "赵晴");
    } finally {
      db.close();
    }
  });

  it("excludes assignee from participant aggregation", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE issues (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          issue_no TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          priority TEXT NOT NULL,
          reporter_id TEXT NOT NULL,
          reporter_name TEXT NOT NULL,
          assignee_id TEXT,
          assignee_name TEXT,
          verifier_id TEXT,
          verifier_name TEXT,
          module_code TEXT,
          version_code TEXT,
          environment_code TEXT,
          resolution_summary TEXT,
          close_reason TEXT,
          close_remark TEXT,
          reopen_count INTEGER NOT NULL DEFAULT 0,
          started_at TEXT,
          resolved_at TEXT,
          verified_at TEXT,
          closed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE issue_participants (
          id TEXT PRIMARY KEY,
          issue_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      const repo = new IssueRepo(db);
      const now = "2026-04-20T08:00:00.000Z";
      repo.create({
        id: "iss_agg_1",
        projectId: "p1",
        issueNo: "PRJ-BUG-0099",
        title: "协作人聚合测试",
        description: null,
        type: "bug",
        status: "in_progress",
        priority: "medium",
        reporterId: "usr_reporter",
        reporterName: "提报人",
        assigneeId: "usr_lisi",
        assigneeName: "李四",
        verifierId: null,
        verifierName: null,
        moduleCode: null,
        versionCode: null,
        environmentCode: null,
        resolutionSummary: null,
        closeReason: null,
        closeRemark: null,
        reopenCount: 0,
        startedAt: null,
        resolvedAt: null,
        verifiedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      db.prepare(
        "INSERT INTO issue_participants (id, issue_id, user_id, user_name, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run("isp_1", "iss_agg_1", "usr_lisi", "李四", now);
      db.prepare(
        "INSERT INTO issue_participants (id, issue_id, user_id, user_name, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run("isp_2", "iss_agg_1", "usr_zhangsan", "张三", now);

      const result = repo.list({
        projectId: "p1",
        page: 1,
        pageSize: 20,
      });

      assert.equal(result.total, 1);
      assert.equal(result.items[0]?.participantCount, 1);
      assert.deepEqual(result.items[0]?.participantNames, ["张三"]);
    } finally {
      db.close();
    }
  });
});
