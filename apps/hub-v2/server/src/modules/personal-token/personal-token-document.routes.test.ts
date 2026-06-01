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

describe("personal token document routes", () => {
  it("creates a project document with personal token and writes token audit log", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["doc:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/docs`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "user-agent": "node-test-agent"
      },
      payload: {
        title: "自动生成文档",
        content: "# 自动生成文档\n\n这是由脚本创建的文档。",
        categoryId: "automation",
        summary: "自动化创建的文档",
        tags: ["auto", "hub-v2"],
        source: "test"
      }
    });

    assert.equal(response.statusCode, 201);
    const payload = response.json();
    assert.equal(payload.code, "OK");
    assert.equal(payload.data.title, "自动生成文档");
    assert.equal(payload.data.categoryId, "automation");
    assert.equal(payload.data.status, "draft");
    assert.ok(payload.data.id);

    const document = ctx.db.prepare("SELECT * FROM documents WHERE id = ?").get(payload.data.id) as any;
    assert.equal(document.project_id, ctx.project.id);
    assert.equal(document.created_by, ctx.admin.userId);
    assert.match(document.slug, /^自动生成文档/);

    const tokenRow = ctx.db.prepare("SELECT last_used_at FROM personal_api_tokens WHERE token_prefix = ?").get(token.slice(0, 17)) as any;
    assert.ok(tokenRow.last_used_at);

    const audit = ctx.db.prepare("SELECT * FROM api_token_audit_logs WHERE resource_id = ?").get(payload.data.id) as any;
    assert.equal(audit.token_type, "personal");
    assert.equal(audit.action, "doc.create");
    assert.equal(audit.resource_type, "doc");
    assert.equal(audit.project_id, ctx.project.id);
    assert.equal(audit.project_key, ctx.project.key);
    assert.equal(audit.actor_user_id, ctx.admin.userId);
    assert.ok(!audit.metadata_json.includes(token));
    assert.ok(!audit.metadata_json.includes("这是由脚本创建的文档"));
    const metadata = JSON.parse(audit.metadata_json);
    assert.deepEqual(metadata.tags, ["auto", "hub-v2"]);
    assert.equal(metadata.source, "test");
  });

  it("rejects project tokens on the personal document endpoint", async () => {
    const ctx = await createTestApp();
    const token = await createProjectToken(ctx);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/docs`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Should not create", content: "content" }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, "AUTH_UNAUTHORIZED");
    assert.equal(countDocuments(ctx), 0);
  });

  it("rejects personal tokens without doc:create:write", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:comment:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/docs`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Missing scope", content: "content" }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "TOKEN_SCOPE_FORBIDDEN");
    assert.equal(countDocuments(ctx), 0);
  });

  it("rejects unknown projectKey before creating a document", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["doc:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: "/api/personal/projects/missing-project/docs",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Missing project", content: "content" }
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, "PROJECT_NOT_FOUND");
    assert.equal(countDocuments(ctx), 0);
  });

  it("rejects non-draft document status", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["doc:create:write"]);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/docs`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Published", content: "content", status: "published" }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "VALIDATION_ERROR");
    assert.equal(countDocuments(ctx), 0);
  });

  it("keeps admin document creation working with the existing schema", async () => {
    const ctx = await createTestApp();
    const jwt = ctx.app.jwt.sign({
      accountId: ctx.admin.accountId,
      userId: ctx.admin.userId,
      nickname: ctx.admin.nickname,
      role: "admin"
    });

    const response = await ctx.app.inject({
      method: "POST",
      url: "/api/admin/documents",
      headers: { authorization: `Bearer ${jwt}` },
      payload: {
        projectId: ctx.project.id,
        slug: "admin-created-doc",
        title: "Admin Created Doc",
        contentMd: "Admin content"
      }
    });

    assert.equal(response.statusCode, 201);
    const payload = response.json();
    assert.equal(payload.code, "OK");
    assert.equal(payload.data.slug, "admin-created-doc");
    assert.equal(payload.data.createdBy, ctx.admin.accountId);
  });
});

async function createTestApp(): Promise<TestApp> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-v2-doc-token-"));
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
  const ctx = {
    app,
    db,
    tempDir,
    admin: {
      accountId: adminRow.id,
      userId: adminRow.user_id,
      nickname: adminRow.nickname
    },
    project
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
  const project = { id: "prj_doc_token", key: "doc-token-project" };
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
    "DOC-TOKEN",
    "DOC",
    "Document Token Project",
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
  ).run("pm_doc_token_owner", project.id, userId, "Test Admin", "project_admin", 1, now, now, now);
  return project;
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

async function createPersonalToken(ctx: TestApp, scopes: Array<"doc:create:write" | "issue:comment:write">): Promise<string> {
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

async function createProjectToken(ctx: TestApp): Promise<string> {
  const result = await ctx.app.container.apiTokenCommand.createProjectToken(
    {
      projectKey: ctx.project.key,
      name: "project-read",
      scopes: ["issues:read"],
      expiresAt: null
    },
    requestContext(ctx)
  );
  return result.token;
}

function countDocuments(ctx: TestApp): number {
  const row = ctx.db.prepare("SELECT COUNT(*) AS total FROM documents").get() as { total: number };
  return row.total;
}
