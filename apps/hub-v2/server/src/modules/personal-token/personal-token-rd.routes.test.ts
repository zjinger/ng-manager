import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { buildContainer } from "../../app/build-container";
import { registerPlugins } from "../../app/register-plugins";
import { registerRoutes } from "../../app/register-routes";
import { runMigrations } from "../../shared/db/migrate";
import type { RequestContext } from "../../shared/context/request-context";
import type { AppConfig } from "../../shared/env/env";
import type { PersonalTokenScope } from "./personal-token.types";

type TestApp = {
  app: FastifyInstance;
  db: Database.Database;
  tempDir: string;
  admin: {
    accountId: string;
    userId: string;
    nickname: string;
  };
  project: {
    id: string;
    key: string;
  };
  stage: {
    id: string;
    name: string;
  };
};

const cleanup: TestApp[] = [];

afterEach(async () => {
  while (cleanup.length > 0) {
    const current = cleanup.pop();
    if (!current) {
      continue;
    }
    await current.app.close();
    fs.rmSync(current.tempDir, { recursive: true, force: true });
  }
});

describe("personal token rd routes", () => {
  it("rejects creating rd item without rd:create:write", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["rd:edit:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items`,
      headers: { authorization: `Bearer ${token}` },
      payload: createRdItemPayload(ctx)
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "TOKEN_SCOPE_FORBIDDEN");
    assert.equal(countRows(ctx.db, "rd_items"), 0);
  });

  it("creates rd item in the project resolved from projectKey", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["rd:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items`,
      headers: { authorization: `Bearer ${token}` },
      payload: createRdItemPayload(ctx, {
        stageTasks: [
          {
            title: "需求梳理",
            ownerId: ctx.admin.userId,
            plannedStartAt: "2026-06-01",
            plannedEndAt: "2026-06-02"
          }
        ]
      })
    });

    assert.equal(response.statusCode, 201);
    const item = response.json().data;
    assert.equal(item.projectId, ctx.project.id);
    assert.equal(item.title, "Token 创建研发项");
    assert.equal(item.stageId, ctx.stage.id);

    const row = ctx.db.prepare("SELECT project_id FROM rd_items WHERE id = ?").get(item.id) as { project_id: string };
    assert.equal(row.project_id, ctx.project.id);
    const task = ctx.db.prepare("SELECT title, owner_id, stage_key FROM rd_stage_tasks WHERE item_id = ?").get(item.id) as {
      title: string;
      owner_id: string;
      stage_key: string;
    };
    assert.equal(task.title, "需求梳理");
    assert.equal(task.owner_id, ctx.admin.userId);
    assert.equal(task.stage_key, "requirement_confirmation");
  });

  it("rejects projectId in personal rd create payload", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["rd:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ...createRdItemPayload(ctx),
        projectId: "prj_other"
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(countRows(ctx.db, "rd_items"), 0);
  });

  it("rejects creating stage task without rd:stage-task:write", async () => {
    const ctx = await createTestApp();
    const item = await createRdItemWithToken(ctx);
    const token = await createPersonalToken(ctx, ["rd:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items/${item.id}/stage-tasks`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "补充需求确认",
        ownerIds: [ctx.admin.userId]
      }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "TOKEN_SCOPE_FORBIDDEN");
  });

  it("creates current-stage rd stage task with personal token", async () => {
    const ctx = await createTestApp();
    const item = await createRdItemWithToken(ctx);
    const token = await createPersonalToken(ctx, ["rd:stage-task:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items/${item.id}/stage-tasks`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "补充需求确认",
        description: "补充接口验收清单",
        ownerIds: [ctx.admin.userId],
        plannedStartAt: "2026-06-03",
        plannedEndAt: "2026-06-04"
      }
    });

    assert.equal(response.statusCode, 201);
    const task = response.json().data;
    assert.equal(task.title, "补充需求确认");
    assert.equal(task.stageKey, "requirement_confirmation");
    assert.deepEqual(task.ownerIds, [ctx.admin.userId]);

    const ownerCount = ctx.db
      .prepare("SELECT COUNT(*) AS total FROM rd_stage_task_owners WHERE task_id = ?")
      .get(task.id) as { total: number };
    assert.equal(ownerCount.total, 1);
  });

  it("rejects empty or non-project stage task owners", async () => {
    const ctx = await createTestApp();
    const item = await createRdItemWithToken(ctx);
    const token = await createPersonalToken(ctx, ["rd:stage-task:write"]);

    const emptyOwnerResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items/${item.id}/stage-tasks`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "无负责人任务",
        ownerIds: []
      }
    });
    assert.equal(emptyOwnerResponse.statusCode, 400);

    const nonMemberResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items/${item.id}/stage-tasks`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "非项目成员任务",
        ownerIds: ["usr_not_member"]
      }
    });
    assert.notEqual(nonMemberResponse.statusCode, 201);
  });
});

async function createTestApp(): Promise<TestApp> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-v2-rd-token-"));
  const dbPath = ":memory:";
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  runMigrations(db, path.resolve(__dirname, "../../.."));

  const config = createTestConfig(tempDir, dbPath);
  const app = Fastify({ logger: false });
  const container = buildContainer(config, db);
  app.decorate("config", config);
  app.decorate("container", container);
  app.decorate("db", db);
  await registerPlugins(app);
  await registerRoutes(app);
  await app.ready();

  const adminRow = db.prepare("SELECT id, user_id, nickname FROM admin_accounts WHERE username = ?").get("admin") as {
    id: string;
    user_id: string;
    nickname: string;
  };
  const project = seedProject(db, adminRow.user_id);
  const stage = seedStage(db, project.id);
  const ctx = {
    app,
    db,
    tempDir,
    admin: {
      accountId: adminRow.id,
      userId: adminRow.user_id,
      nickname: adminRow.nickname
    },
    project,
    stage
  };
  cleanup.push(ctx);
  return ctx;
}

function createTestConfig(tempDir: string, dbPath: string): AppConfig {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    nodeEnv: "test",
    host: "127.0.0.1",
    port: 0,
    logLevel: "error",
    dataDir: tempDir,
    dbPath,
    jwtSecret: "test-jwt-secret-value-that-is-long-enough",
    authCookieName: "ngm_hub_v2_token",
    authCookieSecure: false,
    authTokenExpiresIn: "7d",
    httpsEnabled: false,
    httpsKeyFile: null,
    httpsCertFile: null,
    loginRsaPrivateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    loginRsaPublicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    loginChallengeTtlMs: 120000,
    initAdminUsername: "admin",
    initAdminPassword: "password123",
    initAdminNickname: "Test Admin",
    uploadDir: path.join(tempDir, "uploads"),
    uploadMaxFileSize: 10 * 1024 * 1024,
    openaiApiKey: null,
    openaiBaseUrl: null,
    openaiModel: "",
    surveyEnabled: false,
    reportPublicEnabled: false,
    reportPublicRateLimit: 10
  };
}

function seedProject(db: Database.Database, userId: string): { id: string; key: string } {
  const now = new Date().toISOString();
  const project = { id: "prj_rd_token", key: "rd-token-project" };
  db.prepare(
    `
      INSERT INTO projects (
        id, project_key, project_no, display_code, name, description, icon,
        avatar_upload_id, project_type, contract_no, delivery_date, product_line,
        sla_level, status, visibility, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    project.id,
    project.key,
    "RD-TOKEN",
    "RD",
    "RD Token Project",
    null,
    null,
    null,
    "self_dev",
    null,
    null,
    null,
    null,
    "active",
    "private",
    now,
    now
  );
  db.prepare(
    `
      INSERT INTO project_members (
        id, project_id, user_id, display_name, role_code, is_owner, joined_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run("pm_rd_token_owner", project.id, userId, "Test Admin", "project_admin", 1, now, now, now);
  return project;
}

function seedStage(db: Database.Database, projectId: string): { id: string; name: string } {
  const now = new Date().toISOString();
  const stage = { id: "rds_requirement_confirmation", name: "需求确认" };
  db.prepare(
    `
      INSERT INTO rd_stages (id, project_id, name, sort, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `
  ).run(stage.id, projectId, stage.name, 10, now, now);
  return stage;
}

function requestContext(ctx: TestApp): RequestContext {
  return {
    accountId: ctx.admin.accountId,
    userId: ctx.admin.userId,
    nickname: ctx.admin.nickname,
    roles: ["admin"],
    authType: "user",
    authScopes: ["project.manage.all"],
    source: "http"
  };
}

async function createPersonalToken(ctx: TestApp, scopes: PersonalTokenScope[]): Promise<string> {
  const result = await ctx.app.container.personalTokenCommand.create(
    {
      name: `personal-${scopes.join("-")}`,
      scopes,
      expiresAt: null
    },
    requestContext(ctx)
  );
  return result.token;
}

function createRdItemPayload(ctx: TestApp, overrides: Record<string, unknown> = {}) {
  return {
    title: "Token 创建研发项",
    description: "通过个人 token 创建",
    stageId: ctx.stage.id,
    type: "feature_dev",
    priority: "medium",
    memberIds: [ctx.admin.userId],
    verifierId: ctx.admin.userId,
    planStartAt: "2026-06-01",
    planEndAt: "2026-06-05",
    ...overrides
  };
}

async function createRdItemWithToken(ctx: TestApp): Promise<{ id: string }> {
  const token = await createPersonalToken(ctx, ["rd:create:write"]);
  const response = await ctx.app.inject({
    method: "POST",
    url: `/api/personal/projects/${ctx.project.key}/rd-items`,
    headers: { authorization: `Bearer ${token}` },
    payload: createRdItemPayload(ctx)
  });
  assert.equal(response.statusCode, 201);
  return response.json().data;
}

function countRows(db: Database.Database, tableName: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get() as { total: number };
  return row.total;
}
