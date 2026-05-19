import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import type { EventBus } from "../../shared/event/event-bus";
import type { ContentLogCommandContract } from "../content-log/content-log.contract";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { AnnouncementRepo } from "./announcement.repo";
import { AnnouncementService } from "./announcement.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE announcements (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      domain TEXT NOT NULL DEFAULT 'content',
      title TEXT NOT NULL,
      summary TEXT,
      content_md TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'global',
      pinned INTEGER NOT NULL DEFAULT 0,
      effective_at TEXT,
      notify_related_users INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      publish_at TEXT,
      expire_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE announcement_reads (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_version TEXT NOT NULL,
      read_at TEXT NOT NULL,
      UNIQUE(announcement_id, user_id)
    );
  `);
  return db;
}

const adminCtx = createRequestContext({
  accountId: "adm_1",
  userId: "usr_admin",
  roles: ["admin"],
  authScopes: ["project.manage.all"],
  source: "http"
});

const userCtx = createRequestContext({
  accountId: "adm_2",
  userId: "usr_user",
  roles: ["user"],
  source: "http"
});

const reimbursementManagerCtx = createRequestContext({
  accountId: "adm_3",
  userId: "usr_expense_manager",
  roles: ["user"],
  authScopes: ["expense.rule.manage"],
  source: "http"
});

const eventBus: EventBus = {
  async emit() {},
  subscribe() {
    return () => undefined;
  }
};

const contentLogCommand: ContentLogCommandContract = {
  create() {}
};

const projectAccess: ProjectAccessContract = {
  async listAccessibleProjectIds() {
    return ["proj_1"];
  },
  async requireProjectAccess() {},
  async requireProjectMember() {
    return {
      id: "pm_1",
      projectId: "proj_1",
      userId: "usr_admin",
      displayName: "管理员",
      roleCode: "project_admin",
      isOwner: false,
      joinedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };
  }
};

describe("AnnouncementService", () => {
  it("creates reimbursement announcements as global records with reimbursement fields", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const created = await service.create(
        {
          projectId: "proj_should_be_ignored",
          domain: "reimbursement",
          title: "报销制度更新",
          summary: "摘要",
          contentMd: "正文",
          scope: "project",
          effectiveAt: "2026-05-19",
          notifyRelatedUsers: true,
          pinned: true
        },
        reimbursementManagerCtx
      );

      assert.equal(created.domain, "reimbursement");
      assert.equal(created.projectId, null);
      assert.equal(created.scope, "global");
      assert.equal(created.effectiveAt, "2026-05-19");
      assert.equal(created.notifyRelatedUsers, true);
    } finally {
      db.close();
    }
  });

  it("does not expose reimbursement announcements from the public listing", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const reimbursement = await service.create(
        {
          domain: "reimbursement",
          title: "报销公告",
          contentMd: "内部公告"
        },
        reimbursementManagerCtx
      );
      await service.publish(reimbursement.id, reimbursementManagerCtx);

      const content = await service.create(
        {
          projectId: "proj_1",
          domain: "content",
          title: "项目公告",
          contentMd: "项目正文",
          scope: "project"
        },
        adminCtx
      );
      await service.publish(content.id, adminCtx);

      const publicList = await service.listPublic({ page: 1, pageSize: 20 }, userCtx);
      assert.equal(publicList.items.length, 1);
      assert.equal(publicList.items[0]?.domain, "content");
      assert.equal(publicList.items[0]?.title, "项目公告");
    } finally {
      db.close();
    }
  });

  it("allows reimbursement managers to list reimbursement announcements", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      await service.create(
        {
          domain: "reimbursement",
          title: "草稿报销公告",
          contentMd: "内部草稿"
        },
        reimbursementManagerCtx
      );

      const result = await service.list({ domain: "reimbursement", page: 1, pageSize: 20 }, reimbursementManagerCtx);
      assert.equal(result.total, 1);
      assert.equal(result.items[0]?.domain, "reimbursement");
    } finally {
      db.close();
    }
  });

  it("allows authenticated users to read published reimbursement announcements only", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const draft = await service.create(
        {
          domain: "reimbursement",
          title: "草稿报销公告",
          contentMd: "内部草稿"
        },
        reimbursementManagerCtx
      );
      const published = await service.create(
        {
          domain: "reimbursement",
          title: "已发布报销公告",
          contentMd: "内部已发布"
        },
        reimbursementManagerCtx
      );
      await service.publish(published.id, reimbursementManagerCtx);

      const result = await service.list({ domain: "reimbursement", status: "published", page: 1, pageSize: 20 }, userCtx);
      assert.equal(result.total, 1);
      assert.equal(result.items[0]?.id, published.id);

      await assert.rejects(
        () => service.list({ domain: "reimbursement", page: 1, pageSize: 20 }, userCtx),
        /forbidden/
      );
      await assert.rejects(() => service.getById(draft.id, userCtx), /forbidden/);
      const readable = await service.getById(published.id, userCtx);
      assert.equal(readable.id, published.id);
    } finally {
      db.close();
    }
  });
});
