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
      deleted_at TEXT,
      deleted_by TEXT,
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

const globalAnnouncementManagerCtx = createRequestContext({
  accountId: "adm_4",
  userId: "usr_global_announcement_manager",
  roles: ["user"],
  authScopes: ["announcement.global.manage"],
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
  it("allows project admins to create and publish project announcements", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const created = await service.create(
        {
          projectId: "proj_1",
          domain: "content",
          title: "项目公告",
          contentMd: "项目正文",
          scope: "project"
        },
        adminCtx
      );
      const published = await service.publish(created.id, adminCtx);

      assert.equal(created.projectId, "proj_1");
      assert.equal(created.scope, "project");
      assert.equal(published.status, "published");
    } finally {
      db.close();
    }
  });

  it("rejects non-admin project members from publishing project announcements", async () => {
    const db = createDb();
    const memberAccess: ProjectAccessContract = {
      ...projectAccess,
      async requireProjectMember() {
        return {
          id: "pm_2",
          projectId: "proj_1",
          userId: "usr_user",
          displayName: "成员",
          roleCode: "member",
          isOwner: false,
          joinedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        };
      }
    };
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const created = await service.create(
        {
          projectId: "proj_1",
          domain: "content",
          title: "项目公告",
          contentMd: "项目正文",
          scope: "project"
        },
        adminCtx
      );
      const memberService = new AnnouncementService(new AnnouncementRepo(db), memberAccess, eventBus, contentLogCommand);

      await assert.rejects(() => memberService.publish(created.id, userCtx), /project admin only/);
    } finally {
      db.close();
    }
  });

  it("allows announcement global managers to manage global content announcements", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const created = await service.create(
        {
          domain: "content",
          title: "全局公告",
          contentMd: "全局正文",
          scope: "global"
        },
        globalAnnouncementManagerCtx
      );
      const updated = await service.update(created.id, { title: "全局公告更新" }, globalAnnouncementManagerCtx);
      const published = await service.publish(created.id, globalAnnouncementManagerCtx);
      const archived = await service.archive(created.id, globalAnnouncementManagerCtx);
      const list = await service.list({ domain: "content", page: 1, pageSize: 20 }, globalAnnouncementManagerCtx);

      assert.equal(created.projectId, null);
      assert.equal(created.scope, "global");
      assert.equal(updated.title, "全局公告更新");
      assert.equal(published.status, "published");
      assert.equal(archived.status, "archived");
      assert.equal(list.total, 1);
      assert.equal(list.items[0]?.id, created.id);
    } finally {
      db.close();
    }
  });

  it("rejects users without announcement.global.manage from managing global content announcements", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const created = await service.create(
        {
          domain: "content",
          title: "全局公告",
          contentMd: "全局正文",
          scope: "global"
        },
        globalAnnouncementManagerCtx
      );

      await assert.rejects(
        () => service.create({ domain: "content", title: "无权全局", contentMd: "正文", scope: "global" }, adminCtx),
        /forbidden/
      );
      await assert.rejects(() => service.update(created.id, { title: "无权更新" }, adminCtx), /forbidden/);
      await assert.rejects(() => service.publish(created.id, adminCtx), /forbidden/);
      await assert.rejects(() => service.archive(created.id, adminCtx), /forbidden/);
      await assert.rejects(() => service.list({ domain: "content", page: 1, pageSize: 20 }, adminCtx), /forbidden/);
    } finally {
      db.close();
    }
  });

  it("rejects conflicting content announcement scope and projectId input", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);

      await assert.rejects(
        () =>
          service.create(
            {
              domain: "content",
              title: "缺少项目",
              contentMd: "正文",
              scope: "project"
            },
            adminCtx
          ),
        /project announcements require projectId/
      );
      await assert.rejects(
        () =>
          service.create(
            {
              projectId: "proj_1",
              domain: "content",
              title: "错误全局",
              contentMd: "正文",
              scope: "global"
            },
            globalAnnouncementManagerCtx
          ),
        /global announcements must not include projectId/
      );
    } finally {
      db.close();
    }
  });

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

  it("returns published reimbursement announcement from the public detail endpoint only", async () => {
    const db = createDb();
    try {
      const service = new AnnouncementService(new AnnouncementRepo(db), projectAccess, eventBus, contentLogCommand);
      const reimbursement = await service.create(
        {
          domain: "reimbursement",
          title: "报销公告",
          contentMd: "已发布正文"
        },
        reimbursementManagerCtx
      );
      const content = await service.create(
        {
          domain: "content",
          projectId: "proj_1",
          title: "项目公告",
          contentMd: "项目正文",
          scope: "project"
        },
        adminCtx
      );
      await service.publish(reimbursement.id, reimbursementManagerCtx);
      await service.publish(content.id, adminCtx);

      const publicDetail = await service.getPublicById(reimbursement.id);
      assert.equal(publicDetail.id, reimbursement.id);
      assert.equal(publicDetail.domain, "reimbursement");

      await assert.rejects(() => service.getPublicById(content.id), /announcement not found/);
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
