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

type TestProject = {
  id: string;
  key: string;
};

type TestApp = {
  app: FastifyInstance;
  db: Database.Database;
  tempDir: string;
  admin: {
    accountId: string;
    userId: string;
    nickname: string;
  };
  project: TestProject;
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

describe("personal token issue routes", () => {
  it("rejects creating issue without issue:create:write", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:branch:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues`,
      headers: { authorization: `Bearer ${token}` },
      payload: createIssuePayload(ctx)
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "TOKEN_SCOPE_FORBIDDEN");
    assert.equal(countRows(ctx.db, "issues"), 0);
  });

  it("creates issue in the project resolved from projectKey", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues`,
      headers: { authorization: `Bearer ${token}` },
      payload: createIssuePayload(ctx)
    });

    assert.equal(response.statusCode, 201);
    const issue = response.json().data;
    assert.equal(issue.projectId, ctx.project.id);
    assert.equal(issue.title, "Token 创建测试单");
    assert.equal(issue.assigneeId, ctx.admin.userId);
    assert.equal(issue.verifierId, ctx.admin.userId);

    const row = ctx.db.prepare("SELECT project_id, reporter_id FROM issues WHERE id = ?").get(issue.id) as {
      project_id: string;
      reporter_id: string;
    };
    assert.equal(row.project_id, ctx.project.id);
    assert.equal(row.reporter_id, ctx.admin.userId);
  });

  it("rejects projectId in personal issue create payload", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ...createIssuePayload(ctx),
        projectId: "prj_other"
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(countRows(ctx.db, "issues"), 0);
  });

  it("rejects non-project assignee or verifier", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues`,
      headers: { authorization: `Bearer ${token}` },
      payload: createIssuePayload(ctx, {
        assigneeId: "usr_not_member",
        verifierId: "usr_not_member"
      })
    });

    assert.notEqual(response.statusCode, 201);
    assert.equal(countRows(ctx.db, "issues"), 0);
  });

  it("rejects rdItemId from another project", async () => {
    const ctx = await createTestApp();
    const otherProject = seedProject(ctx.db, ctx.admin.userId, {
      id: "prj_issue_token_other",
      key: "issue-token-other-project",
      projectNo: "ISSUE-OTHER",
      displayCode: "IOTH",
      name: "Issue Token Other Project",
      memberId: "pm_issue_token_other_owner"
    });
    const otherStage = seedStage(ctx.db, otherProject.id, {
      id: "rds_issue_token_other_requirement",
      name: "需求确认"
    });
    const otherRdItem = await ctx.app.container.rdCommand.createItem(
      {
        projectId: otherProject.id,
        title: "其他项目研发项",
        stageId: otherStage.id,
        type: "feature_dev",
        priority: "medium",
        memberIds: [ctx.admin.userId],
        verifierId: ctx.admin.userId
      },
      requestContext(ctx)
    );
    const token = await createPersonalToken(ctx, ["issue:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues`,
      headers: { authorization: `Bearer ${token}` },
      payload: createIssuePayload(ctx, {
        rdItemId: otherRdItem.id
      })
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "BAD_REQUEST");
    assert.equal(countRows(ctx.db, "issues"), 0);
  });

  it("keeps issue branch creation behind issue:branch:write", async () => {
    const ctx = await createTestApp();
    const issue = await createIssueWithToken(ctx);
    const token = await createPersonalToken(ctx, ["issue:branch:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues/${issue.id}/branches`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ownerUserId: ctx.admin.userId,
        title: "补充验证分支"
      }
    });

    assert.equal(response.statusCode, 201);
    const branch = response.json().data;
    assert.equal(branch.issueId, issue.id);
    assert.equal(branch.ownerUserId, ctx.admin.userId);
  });
});

async function createTestApp(): Promise<TestApp> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-v2-issue-token-"));
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
  const project = seedProject(db, adminRow.user_id, {
    id: "prj_issue_token",
    key: "issue-token-project",
    projectNo: "ISSUE-TOKEN",
    displayCode: "ISS",
    name: "Issue Token Project",
    memberId: "pm_issue_token_owner"
  });
  const stage = seedStage(db, project.id, {
    id: "rds_issue_token_requirement",
    name: "需求确认"
  });
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

function seedProject(
  db: Database.Database,
  userId: string,
  input: {
    id: string;
    key: string;
    projectNo: string;
    displayCode: string;
    name: string;
    memberId: string;
  }
): TestProject {
  const now = new Date().toISOString();
  const project = { id: input.id, key: input.key };
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
    input.projectNo,
    input.displayCode,
    input.name,
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
  ).run(input.memberId, project.id, userId, "Test Admin", "project_admin", 1, now, now, now);
  return project;
}

function seedStage(
  db: Database.Database,
  projectId: string,
  input: {
    id: string;
    name: string;
  }
): { id: string; name: string } {
  const now = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO rd_stages (id, project_id, name, sort, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `
  ).run(input.id, projectId, input.name, 10, now, now);
  return input;
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

function createIssuePayload(ctx: TestApp, overrides: Record<string, unknown> = {}) {
  return {
    title: "Token 创建测试单",
    description: "通过个人 token 创建",
    type: "bug",
    priority: "medium",
    assigneeId: ctx.admin.userId,
    verifierId: ctx.admin.userId,
    moduleCode: "auth",
    versionCode: "v1",
    environmentCode: "test",
    ...overrides
  };
}

async function createIssueWithToken(ctx: TestApp): Promise<{ id: string }> {
  const token = await createPersonalToken(ctx, ["issue:create:write"]);
  const response = await ctx.app.inject({
    method: "POST",
    url: `/api/personal/projects/${ctx.project.key}/issues`,
    headers: { authorization: `Bearer ${token}` },
    payload: createIssuePayload(ctx)
  });
  assert.equal(response.statusCode, 201);
  return response.json().data;
}

function countRows(db: Database.Database, tableName: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get() as { total: number };
  return row.total;
}
