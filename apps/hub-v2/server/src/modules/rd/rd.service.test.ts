import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext, type RequestContext } from "../../shared/context/request-context";
import type { DomainEvent } from "../../shared/event/domain-event";
import type { EventBus } from "../../shared/event/event-bus";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { ProjectMemberEntity } from "../project/project.types";
import type { UploadCommandContract } from "../upload/upload.contract";
import type { CreateUploadInput, UploadEntity } from "../upload/upload.types";
import { RdRepo } from "./rd.repo";
import { RdService } from "./rd.service";

function createRdDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE rd_stages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      project_key TEXT NOT NULL,
      name TEXT NOT NULL,
      display_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE rd_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      rd_no TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      description TEXT,
      stage_id TEXT,
      type TEXT NOT NULL DEFAULT 'feature_dev',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT,
      assignee_name TEXT,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      verifier_id TEXT,
      verifier_name TEXT,
      member_ids TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      plan_start_at TEXT,
      plan_end_at TEXT,
      actual_start_at TEXT,
      actual_end_at TEXT,
      blocker_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE rd_stage_history (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      from_stage_id TEXT,
      from_stage_name TEXT NOT NULL,
      to_stage_id TEXT,
      to_stage_name TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      operator_id TEXT,
      operator_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE rd_item_stage_notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(item_id, stage_id)
    );

    CREATE TABLE rd_item_progress (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      progress INTEGER NOT NULL,
      note TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE (item_id, user_id)
    );

    CREATE TABLE rd_progress_history (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      old_progress INTEGER,
      new_progress INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE rd_stage_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      owner_id TEXT,
      owner_name TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      planned_start_at TEXT,
      planned_end_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE rd_stage_task_owners (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(task_id, user_id)
    );

    CREATE TABLE rd_logs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      content TEXT NOT NULL,
      operator_id TEXT,
      operator_name TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );
  `);
  db.prepare(
    "INSERT INTO projects (id, project_key, name, display_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("project_1", "test", "测试项目", "YFX", "2026-05-30T00:00:00.000Z", "2026-05-30T00:00:00.000Z");
  return db;
}

function seedRdScenario(repo: RdRepo): void {
  const now = "2026-05-30T10:00:00.000Z";
  repo.createStage({
    id: "stage_a",
    projectId: "project_1",
    name: "需求确认",
    sort: 10,
    enabled: true,
    createdAt: now,
    updatedAt: now
  });
  repo.createStage({
    id: "stage_b",
    projectId: "project_1",
    name: "功能开发",
    sort: 20,
    enabled: true,
    createdAt: now,
    updatedAt: now
  });
  repo.createStage({
    id: "stage_c",
    projectId: "project_1",
    name: "测试验证",
    sort: 30,
    enabled: true,
    createdAt: now,
    updatedAt: now
  });
  repo.createItem({
    id: "rdi_1",
    projectId: "project_1",
    rdNo: "YFX-FEAT-0001",
    version: 1,
    title: "登录功能",
    description: "登录功能描述",
    stageId: "stage_b",
    type: "feature_dev",
    status: "accepted",
    priority: "medium",
    assigneeId: "dev_1",
    assigneeName: "李四",
    creatorId: "creator_1",
    creatorName: "创建人",
    verifierId: "verifier_old",
    verifierName: "王雯",
    memberIds: ["dev_1"],
    progress: 100,
    planStartAt: "2026-05-30",
    planEndAt: "2026-05-31",
    actualStartAt: "2026-05-30T10:00:00.000Z",
    actualEndAt: "2026-05-30T18:00:00.000Z",
    blockerReason: null,
    createdAt: now,
    updatedAt: now
  });
  repo.createStageHistory({
    id: "rdsh_a",
    projectId: "project_1",
    itemId: "rdi_1",
    fromStageId: "stage_a",
    fromStageName: "需求确认",
    toStageId: "stage_b",
    toStageName: "功能开发",
    snapshotJson: JSON.stringify({
      stageId: "stage_a",
      stageName: "需求确认",
      status: "accepted",
      progress: 100,
      assigneeId: "dev_1",
      assigneeName: "李四",
      verifierId: "verifier_old",
      verifierName: "王雯",
      memberIds: ["dev_1"],
      memberNames: ["李四"],
      planStartAt: "2026-05-29",
      planEndAt: "2026-05-30",
      actualStartAt: "2026-05-29T09:00:00.000Z",
      actualEndAt: "2026-05-30T09:00:00.000Z",
      blockerReason: null
    }),
    operatorId: "verifier_old",
    operatorName: "王雯",
    createdAt: "2026-05-30T09:00:00.000Z"
  });
}

function ctx(userId: string, nickname: string = userId): RequestContext {
  return createRequestContext({
    accountId: `acct_${userId}`,
    userId,
    nickname,
    roles: ["user"],
    authScopes: [],
    source: "http"
  });
}

class FakeProjectAccess implements ProjectAccessContract {
  private readonly members = new Map<string, ProjectMemberEntity>(
    [
      ["creator_1", "创建人"],
      ["dev_1", "李四"],
      ["dev_2", "张三"],
      ["verifier_old", "王雯"],
      ["verifier_new", "张三"]
    ].map(([userId, displayName]) => [
      userId,
      {
        id: `pm_${userId}`,
        projectId: "project_1",
        userId,
        displayName,
        roleCode: "member",
        isOwner: userId === "creator_1",
        joinedAt: "2026-05-30T00:00:00.000Z",
        createdAt: "2026-05-30T00:00:00.000Z",
        updatedAt: "2026-05-30T00:00:00.000Z"
      }
    ])
  );

  async listAccessibleProjectIds(): Promise<string[]> {
    return ["project_1"];
  }

  async requireProjectAccess(projectId: string): Promise<void> {
    assert.equal(projectId, "project_1");
  }

  async requireProjectMember(projectId: string, userId: string): Promise<ProjectMemberEntity> {
    assert.equal(projectId, "project_1");
    const member = this.members.get(userId);
    if (!member) {
      throw new Error(`unexpected member: ${userId}`);
    }
    return member;
  }
}

class FakeEventBus implements EventBus {
  readonly events: DomainEvent[] = [];

  async emit(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  subscribe(): () => void {
    return () => {};
  }
}

class FakeUploadCommand implements UploadCommandContract {
  async create(_input: CreateUploadInput, _ctx: RequestContext): Promise<UploadEntity> {
    throw new Error("not used");
  }

  async promoteMarkdownUploads(): Promise<void> {}

  async deactivateUpload(): Promise<void> {}
}

describe("RdService stage history snapshots", () => {
  it("keeps previous stage history verifier unchanged when editing current item verifier", async () => {
    const db = createRdDb();
    try {
      const repo = new RdRepo(db);
      seedRdScenario(repo);
      const service = new RdService(repo, new FakeProjectAccess(), new FakeEventBus(), new FakeUploadCommand());

      const updated = await service.updateItem(
        "rdi_1",
        {
          version: 1,
          verifierId: "verifier_new"
        },
        ctx("creator_1", "创建人")
      );
      assert.equal(updated.verifierId, "verifier_new");
      assert.equal(updated.verifierName, "张三");

      const historyAfterEdit = await service.listStageHistory("rdi_1", ctx("creator_1", "创建人"));
      const previousSnapshot = JSON.parse(historyAfterEdit.find((entry) => entry.id === "rdsh_a")?.snapshotJson ?? "{}") as {
        verifierId?: string;
        verifierName?: string;
      };
      assert.equal(previousSnapshot.verifierId, "verifier_old");
      assert.equal(previousSnapshot.verifierName, "王雯");

      await service.advanceStage(
        "rdi_1",
        {
          stageId: "stage_c"
        },
        ctx("verifier_new", "张三")
      );

      const historyAfterAdvance = await service.listStageHistory("rdi_1", ctx("creator_1", "创建人"));
      const currentStageSnapshot = JSON.parse(historyAfterAdvance[0]?.snapshotJson ?? "{}") as {
        stageId?: string;
        verifierId?: string;
        verifierName?: string;
      };
      assert.equal(currentStageSnapshot.stageId, "stage_b");
      assert.equal(currentStageSnapshot.verifierId, "verifier_new");
      assert.equal(currentStageSnapshot.verifierName, "张三");

      const unchangedPreviousSnapshot = JSON.parse(historyAfterAdvance.find((entry) => entry.id === "rdsh_a")?.snapshotJson ?? "{}") as {
        verifierId?: string;
        verifierName?: string;
      };
      assert.equal(unchangedPreviousSnapshot.verifierId, "verifier_old");
      assert.equal(unchangedPreviousSnapshot.verifierName, "王雯");
    } finally {
      db.close();
    }
  });
});

describe("RdService stage task assignment progress", () => {
  it("creates baseline stage tasks for every member when no explicit task is provided", async () => {
    const db = createRdDb();
    try {
      const repo = new RdRepo(db);
      seedRdScenario(repo);
      const service = new RdService(repo, new FakeProjectAccess(), new FakeEventBus(), new FakeUploadCommand());

      const item = await service.createItem(
        {
          projectId: "project_1",
          title: "多人研发项",
          stageId: "stage_b",
          memberIds: ["dev_1", "dev_2"],
          verifierId: "verifier_old"
        },
        ctx("creator_1", "创建人")
      );

      const tasks = await service.listStageTasks(item.id, ctx("creator_1", "创建人"));
      assert.equal(tasks.length, 2);
      assert.deepEqual(
        tasks.map((task) => [task.title, task.ownerIds[0], task.progress, task.status]),
        [
          ["功能开发阶段任务", "dev_1", 0, "pending"],
          ["功能开发阶段任务", "dev_2", 0, "pending"]
        ]
      );
      assert.equal(item.progress, 0);
    } finally {
      db.close();
    }
  });

  it("calculates member and item progress by task owner assignments", async () => {
    const db = createRdDb();
    try {
      const repo = new RdRepo(db);
      seedRdScenario(repo);
      const service = new RdService(repo, new FakeProjectAccess(), new FakeEventBus(), new FakeUploadCommand());

      const item = await service.createItem(
        {
          projectId: "project_1",
          title: "追加共同任务",
          stageId: "stage_b",
          memberIds: ["dev_1", "dev_2"],
          verifierId: "verifier_old"
        },
        ctx("creator_1", "创建人")
      );
      const baselineTasks = await service.listStageTasks(item.id, ctx("creator_1", "创建人"));

      await service.updateProgress(
        item.id,
        { stageTaskId: baselineTasks.find((task) => task.ownerIds.includes("dev_1"))!.id, progress: 100 },
        ctx("dev_1", "李四")
      );
      const completed = await service.updateProgress(
        item.id,
        { stageTaskId: baselineTasks.find((task) => task.ownerIds.includes("dev_2"))!.id, progress: 100 },
        ctx("dev_2", "张三")
      );
      assert.equal(completed.progress, 100);

      const afterAppend = await service.createStageTask(
        item.id,
        {
          stageKey: "feature_dev",
          title: "前后端联调",
          ownerIds: ["dev_1", "dev_2"]
        },
        ctx("creator_1", "创建人")
      );
      assert.equal(afterAppend.progress, 0);

      const latest = await service.getItemById(item.id, ctx("creator_1", "创建人"));
      assert.equal(latest.progress, 50);
      const progressRows = await service.listProgress(item.id, ctx("creator_1", "创建人"));
      assert.deepEqual(
        progressRows.map((row) => [row.userId, row.progress]).sort(),
        [
          ["dev_1", 50],
          ["dev_2", 50]
        ]
      );
    } finally {
      db.close();
    }
  });

  it("keeps removed task owners as cancelled assignments and excludes them from progress", async () => {
    const db = createRdDb();
    try {
      const repo = new RdRepo(db);
      seedRdScenario(repo);
      const service = new RdService(repo, new FakeProjectAccess(), new FakeEventBus(), new FakeUploadCommand());

      const item = await service.createItem(
        {
          projectId: "project_1",
          title: "移交任务",
          stageId: "stage_b",
          memberIds: ["dev_1", "dev_2"],
          verifierId: "verifier_old"
        },
        ctx("creator_1", "创建人")
      );
      const sharedTask = await service.createStageTask(
        item.id,
        {
          stageKey: "feature_dev",
          title: "接口联调",
          ownerIds: ["dev_1", "dev_2"]
        },
        ctx("creator_1", "创建人")
      );

      await service.updateItemWithStageTasks(
        item.id,
        {
          version: (await service.getItemById(item.id, ctx("creator_1", "创建人"))).version,
          taskUpdates: [{ taskId: sharedTask.id, input: { ownerIds: ["dev_1"] } }]
        },
        ctx("creator_1", "创建人")
      );

      const updatedSharedTask = (await service.listStageTasks(item.id, ctx("creator_1", "创建人")))
        .find((task) => task.id === sharedTask.id);
      assert.ok(updatedSharedTask);
      assert.deepEqual(updatedSharedTask.ownerIds, ["dev_1"]);
      assert.equal(updatedSharedTask.ownerProgresses.find((owner) => owner.userId === "dev_2")?.status, "cancelled");
      const latest = await service.getItemById(item.id, ctx("creator_1", "创建人"));
      assert.equal(latest.progress, 0);
    } finally {
      db.close();
    }
  });

  it("rejects cancelling the last active current-stage assignment", async () => {
    const db = createRdDb();
    try {
      const repo = new RdRepo(db);
      seedRdScenario(repo);
      const service = new RdService(repo, new FakeProjectAccess(), new FakeEventBus(), new FakeUploadCommand());

      const item = await service.createItem(
        {
          projectId: "project_1",
          title: "最后任务保护",
          stageId: "stage_b",
          memberIds: ["dev_1"],
          verifierId: "verifier_old"
        },
        ctx("creator_1", "创建人")
      );
      const [task] = await service.listStageTasks(item.id, ctx("creator_1", "创建人"));

      await assert.rejects(
        () =>
          service.updateItemWithStageTasks(
            item.id,
            {
              version: 1,
              taskCancelIds: [task.id]
            },
            ctx("creator_1", "创建人")
          ),
        /current stage must keep at least one active stage task owner/
      );
    } finally {
      db.close();
    }
  });
});
