import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext, type RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import type { ProjectAccessContract } from "../project/project-access.contract";
import type { ProjectMemberEntity } from "../project/project.types";
import type { UploadQueryContract } from "../upload/upload.contract";
import type { UploadEntity } from "../upload/upload.types";
import { assertUploadAllowed, resolveUploadPolicy } from "../upload/upload-policy";
import { RdTaskSheetRepo } from "./rd-task-sheet.repo";
import { RdTaskSheetService } from "./rd-task-sheet.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE uploads (
      id TEXT PRIMARY KEY,
      file_name TEXT,
      original_name TEXT,
      mime_type TEXT,
      file_size INTEGER,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE rd_task_sheets (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      sheet_no TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      title TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      issuer_department TEXT,
      issuer_user_id TEXT,
      issuer_name TEXT NOT NULL,
      receiver_department TEXT,
      receiver_user_id TEXT,
      receiver_name TEXT,
      receiver_phone TEXT,
      processor_user_id TEXT,
      processor_name TEXT,
      customer_company TEXT,
      customer_contact TEXT,
      customer_phone TEXT,
      project_name TEXT,
      project_contact TEXT,
      related_system TEXT,
      urgency TEXT NOT NULL DEFAULT 'normal',
      business_type TEXT NOT NULL DEFAULT 'technical_service',
      expected_resolved_at TEXT,
      resolved_at TEXT,
      result TEXT,
      business_description TEXT NOT NULL,
      delivery_content TEXT,
      close_reason TEXT,
      converted_rd_item_id TEXT,
      converted_issue_id TEXT,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      issued_at TEXT,
      processing_started_at TEXT,
      replied_at TEXT,
      closed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE rd_task_sheet_attachments (
      id TEXT PRIMARY KEY,
      sheet_id TEXT NOT NULL,
      upload_id TEXT NOT NULL,
      created_by_user_id TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(sheet_id, upload_id)
    );
    CREATE TABLE rd_task_sheet_logs (
      id TEXT PRIMARY KEY,
      sheet_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_user_id TEXT,
      actor_name TEXT,
      comment TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE rd_task_sheet_default_routes (
      id TEXT PRIMARY KEY,
      issuer_user_id TEXT,
      issuer_name TEXT,
      issuer_department TEXT,
      receiver_user_id TEXT,
      receiver_name TEXT,
      receiver_department TEXT,
      receiver_phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      remark TEXT,
      sort INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT,
      updated_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_creator", "creator", "发起人", "active");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_receiver", "receiver", "接收人", "active");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_project", "project", "项目成员", "active");
  db.prepare("INSERT INTO users (id, username, display_name, status) VALUES (?, ?, ?, ?)").run("usr_other", "other", "无关人员", "active");
  db.prepare("INSERT INTO projects (id, name, status) VALUES (?, ?, ?)").run("prj_1", "协作平台", "active");
  db.prepare("INSERT INTO uploads (id, file_name, original_name, mime_type, file_size, status) VALUES (?, ?, ?, ?, ?, ?)")
    .run("upl_word", "task.docx", "任务单.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1024, "active");
  return db;
}

function ctx(userId: string, scopes: string[] = ["task_sheet.submit", "task_sheet.view.self"]) {
  return createRequestContext({
    accountId: `adm_${userId}`,
    userId,
    nickname: userId,
    roles: ["user"],
    authScopes: scopes,
    source: "http"
  });
}

class FakeProjectAccess implements ProjectAccessContract {
  constructor(private readonly grants: Record<string, string[]> = {}) {}

  async listAccessibleProjectIds(ctx: RequestContext): Promise<string[]> {
    return this.grants[ctx.userId ?? ""] ?? [];
  }

  async requireProjectAccess(projectId: string, ctx: RequestContext): Promise<void> {
    if ((this.grants[ctx.userId ?? ""] ?? []).includes(projectId) || ctx.authScopes?.includes("task_sheet.manage")) {
      return;
    }
    throw new AppError("PROJECT_ACCESS_DENIED", "project access forbidden", 403);
  }

  async requireProjectMember(): Promise<ProjectMemberEntity> {
    throw new Error("not used");
  }
}

class FakeUploadQuery implements UploadQueryContract {
  async getById(id: string): Promise<UploadEntity> {
    if (id !== "upl_word") {
      throw new AppError("UPLOAD_NOT_FOUND", "upload not found", 404);
    }
    return {
      id,
      bucket: "task-sheets",
      category: "attachment",
      fileName: "task.docx",
      originalName: "任务单.docx",
      fileExt: ".docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 1024,
      checksum: null,
      storageProvider: "local",
      storagePath: "/tmp/task.docx",
      visibility: "private",
      status: "active",
      uploaderId: "usr_creator",
      uploaderName: "发起人",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

function service(db: Database.Database, grants: Record<string, string[]> = {}) {
  return new RdTaskSheetService(new RdTaskSheetRepo(db), new FakeProjectAccess(grants), new FakeUploadQuery());
}

describe("RdTaskSheetService", () => {
  it("creates an unlinked task sheet and completes the lightweight workflow", async () => {
    const db = createDb();
    try {
      const svc = service(db);
      const created = await svc.create(
        {
          title: "北斗船端协议变更",
          receiverUserId: "usr_receiver",
          businessDescription: "协议范围由中天模块变更为天海达模块",
          attachments: [{ uploadId: "upl_word" }]
        },
        ctx("usr_creator")
      );
      assert.equal(created.projectId, null);
      assert.equal(created.status, "draft");
      assert.equal(created.receiverName, "接收人");
      assert.equal(created.attachments.length, 1);
      assert.match(created.sheetNo, /^\d{6}0001$/);

      const issued = await svc.issue(created.id, ctx("usr_creator"));
      assert.equal(issued.status, "issued");
      const processing = await svc.startProcessing(issued.id, ctx("usr_receiver"));
      assert.equal(processing.status, "processing");
      assert.equal(processing.processorUserId, "usr_receiver");
      const replied = await svc.reply(processing.id, { result: "resolved", deliveryContent: "已完成协议变更" }, ctx("usr_receiver"));
      assert.equal(replied.status, "replied");
      assert.equal(replied.result, "resolved");
      const closed = await svc.close(replied.id, {}, ctx("usr_creator"));
      assert.equal(closed.status, "closed");
      assert.deepEqual(closed.logs.map((log) => log.action), ["create", "issue", "start_processing", "reply", "close"]);
    } finally {
      db.close();
    }
  });

  it("allows related users but rejects unrelated users for unlinked sheets", async () => {
    const db = createDb();
    try {
      const svc = service(db);
      const created = await svc.create(
        { title: "外部任务", receiverUserId: "usr_receiver", businessDescription: "请协助处理" },
        ctx("usr_creator")
      );
      assert.equal((await svc.getById(created.id, ctx("usr_receiver"))).id, created.id);
      await assert.rejects(() => svc.getById(created.id, ctx("usr_other")), /forbidden/);
    } finally {
      db.close();
    }
  });

  it("adds project visibility while keeping related users visible", async () => {
    const db = createDb();
    try {
      const svc = service(db, {
        usr_creator: ["prj_1"],
        usr_project: ["prj_1"]
      });
      const created = await svc.create(
        { projectId: "prj_1", title: "项目内任务", receiverUserId: "usr_receiver", businessDescription: "项目相关" },
        ctx("usr_creator")
      );
      assert.equal((await svc.getById(created.id, ctx("usr_project"))).id, created.id);
      assert.equal((await svc.getById(created.id, ctx("usr_receiver"))).id, created.id);
    } finally {
      db.close();
    }
  });

  it("filters by linked and unlinked project state", async () => {
    const db = createDb();
    try {
      const svc = service(db, { usr_creator: ["prj_1"] });
      await svc.create({ title: "未关联", businessDescription: "A" }, ctx("usr_creator"));
      await svc.create({ projectId: "prj_1", title: "已关联", businessDescription: "B" }, ctx("usr_creator"));

      const unlinked = await svc.list({ unlinked: true }, ctx("usr_creator"));
      assert.deepEqual(unlinked.items.map((item) => item.title), ["未关联"]);
      const linked = await svc.list({ projectId: "prj_1" }, ctx("usr_creator"));
      assert.deepEqual(linked.items.map((item) => item.title), ["已关联"]);
    } finally {
      db.close();
    }
  });

  it("keeps manager related scope separate from all task sheets", async () => {
    const db = createDb();
    try {
      const svc = service(db, {
        usr_creator: ["prj_1"],
        usr_other: ["prj_1"]
      });
      await svc.create({ title: "无关任务", businessDescription: "A" }, ctx("usr_creator"));
      await svc.create({ title: "接收任务", receiverUserId: "usr_other", businessDescription: "B" }, ctx("usr_creator"));
      await svc.create({ projectId: "prj_1", title: "项目任务", businessDescription: "C" }, ctx("usr_creator"));

      const managerCtx = ctx("usr_other", ["task_sheet.manage", "task_sheet.view.self"]);
      const related = await svc.list({ scope: "related" }, managerCtx);
      assert.deepEqual(new Set(related.items.map((item) => item.title)), new Set(["接收任务", "项目任务"]));

      const all = await svc.list({ scope: "all" }, managerCtx);
      assert.deepEqual(new Set(all.items.map((item) => item.title)), new Set(["无关任务", "接收任务", "项目任务"]));
    } finally {
      db.close();
    }
  });

  it("supports attachment removal and task sheet upload policy", async () => {
    const db = createDb();
    try {
      const svc = service(db);
      const created = await svc.create(
        { title: "附件任务", businessDescription: "有附件", attachments: [{ uploadId: "upl_word" }] },
        ctx("usr_creator")
      );
      const attachmentId = created.attachments[0]!.id;
      const detached = await svc.detach(created.id, attachmentId, ctx("usr_creator"));
      assert.equal(detached.attachments.length, 0);

      const policy = resolveUploadPolicy("task-sheets", "attachment");
      assert.doesNotThrow(() =>
        assertUploadAllowed(
          {
            fileName: "任务单.docx",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileSize: 1024
          },
          policy,
          10 * 1024 * 1024
        )
      );
      assert.throws(
        () =>
          assertUploadAllowed(
            { fileName: "数据.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 1024 },
            policy,
            10 * 1024 * 1024
          ),
        /仅支持 Word \/ PDF \/ JPG \/ PNG/
      );
    } finally {
      db.close();
    }
  });

  it("allows managers to maintain default routes and submitters to read their own route", async () => {
    const db = createDb();
    try {
      const svc = service(db);
      const managerCtx = ctx("usr_creator", ["task_sheet.manage"]);
      const route = await svc.createDefaultRoute(
        {
          issuerUserId: "usr_creator",
          issuerDepartment: "天元海研发一部",
          receiverUserId: "usr_receiver",
          receiverDepartment: "深蓝信息",
          receiverPhone: "13543006443",
          sort: 5
        },
        managerCtx
      );
      assert.equal(route.issuerName, "发起人");
      assert.equal(route.receiverName, "接收人");
      assert.equal(route.receiverPhone, "13543006443");

      const ownRoute = await svc.getMyDefaultRoute(ctx("usr_creator"));
      assert.equal(ownRoute?.id, route.id);
      assert.equal((await svc.getMyDefaultRoute(ctx("usr_other"))), null);

      const updated = await svc.updateDefaultRoute(route.id, { receiverName: "外部接收人", receiverUserId: null }, managerCtx);
      assert.equal(updated.receiverUserId, null);
      assert.equal(updated.receiverName, "外部接收人");

      await svc.deleteDefaultRoute(route.id, managerCtx);
      assert.equal((await svc.getMyDefaultRoute(ctx("usr_creator"))), null);
    } finally {
      db.close();
    }
  });

  it("rejects default route maintenance without task sheet manage permission", async () => {
    const db = createDb();
    try {
      const svc = service(db);
      await assert.rejects(
        () => svc.createDefaultRoute({ issuerUserId: "usr_creator", receiverName: "接收人" }, ctx("usr_creator")),
        /forbidden/
      );
      await assert.rejects(() => svc.listDefaultRoutes({}, ctx("usr_creator")), /forbidden/);
    } finally {
      db.close();
    }
  });
});
