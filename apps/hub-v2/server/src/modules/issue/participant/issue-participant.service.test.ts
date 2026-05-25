import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import type { RequestContext } from "../../../shared/context/request-context";
import type { EventBus } from "../../../shared/event/event-bus";
import type { ProjectAccessContract } from "../../project/project-access.contract";
import type { ProjectMemberEntity } from "../../project/project.types";
import { IssueBranchRepo } from "../branch/issue-branch.repo";
import { IssueRepo } from "../issue.repo";
import type { IssueEntity } from "../issue.types";
import { IssueParticipantRepo } from "./issue-participant.repo";
import { IssueParticipantService } from "./issue-participant.service";

describe("IssueParticipantService", () => {
  it("creates todo branches for participant tasks supplied during batch add", async () => {
    const db = new Database(":memory:");
    try {
      createIssueTables(db);
      const issueRepo = new IssueRepo(db);
      const participantRepo = new IssueParticipantRepo(db);
      const branchRepo = new IssueBranchRepo(db);
      const projectAccess = createProjectAccess({
        usr_lisi: "李四",
        usr_wangwu: "王五"
      });
      const eventBus = createEventBus();
      const service = new IssueParticipantService(issueRepo, participantRepo, branchRepo, projectAccess, eventBus);
      issueRepo.create(createIssue());

      const participants = await service.addBatch(
        "iss_task_1",
        {
          userIds: ["usr_lisi", "usr_wangwu"],
          tasks: [{ userId: "usr_lisi", title: "补抓包定位登录异常" }]
        },
        createContext()
      );

      assert.equal(participants.length, 2);

      const branches = branchRepo.listByIssueId("iss_task_1");
      assert.equal(branches.length, 1);
      assert.equal(branches[0]?.ownerUserId, "usr_lisi");
      assert.equal(branches[0]?.ownerUserName, "李四");
      assert.equal(branches[0]?.title, "补抓包定位登录异常");
      assert.equal(branches[0]?.status, "todo");

      const logs = issueRepo.listLogs("iss_task_1");
      assert.ok(logs.some((log) => log.summary === "添加协作人 李四、王五"));
      assert.ok(logs.some((log) => log.summary === "创建协作分支：补抓包定位登录异常 -> 李四"));
    } finally {
      db.close();
    }
  });
});

function createIssueTables(db: Database.Database): void {
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
      rd_item_id TEXT,
      rd_no_snapshot TEXT,
      rd_title_snapshot TEXT,
      rd_status_snapshot TEXT,
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
      last_urged_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE issue_logs (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      operator_id TEXT,
      operator_name TEXT,
      summary TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE issue_participants (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE issue_branches (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      owner_user_name TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      summary TEXT NULL,
      started_at TEXT NULL,
      finished_at TEXT NULL,
      created_by_id TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function createIssue(): IssueEntity {
  const now = "2026-05-25T08:00:00.000Z";
  return {
    id: "iss_task_1",
    projectId: "proj_1",
    issueNo: "PRJ-BUG-0001",
    title: "登录异常",
    description: null,
    type: "bug",
    status: "in_progress",
    priority: "medium",
    reporterId: "usr_reporter",
    reporterName: "提报人",
    assigneeId: "usr_owner",
    assigneeName: "负责人",
    verifierId: null,
    verifierName: null,
    rdItemId: null,
    rdNoSnapshot: null,
    rdTitleSnapshot: null,
    rdStatusSnapshot: null,
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
    updatedAt: now
  };
}

function createContext(): RequestContext {
  return {
    accountId: "acc_reporter",
    userId: "usr_reporter",
    nickname: "提报人",
    roles: [],
    authType: "user",
    source: "http"
  };
}

function createProjectAccess(memberNames: Record<string, string>): ProjectAccessContract {
  return {
    async listAccessibleProjectIds() {
      return ["proj_1"];
    },
    async requireProjectAccess() {},
    async requireProjectMember(projectId: string, userId: string) {
      const displayName = memberNames[userId] ?? userId;
      return createProjectMember(projectId, userId, displayName);
    }
  };
}

function createProjectMember(projectId: string, userId: string, displayName: string): ProjectMemberEntity {
  const now = "2026-05-25T08:00:00.000Z";
  return {
    id: `pm_${userId}`,
    projectId,
    userId,
    displayName,
    roleCode: "member",
    isOwner: false,
    joinedAt: now,
    createdAt: now,
    updatedAt: now
  };
}

function createEventBus(): EventBus {
  return {
    async emit() {},
    subscribe() {
      return () => {};
    }
  };
}
