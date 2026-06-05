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

describe("personal token markdown upload routes", () => {
  it("rejects markdown upload without a business write scope", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:branch:write"]);

    const response = await postMarkdownImage(ctx, token, {
      fileName: "shot.png",
      contentType: "image/png",
      file: pngBuffer()
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "TOKEN_SCOPE_FORBIDDEN");
    assert.equal(countRows(ctx.db, "uploads"), 0);
  });

  it("accepts images as temp markdown uploads and rejects non-images", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:create:write"]);

    const imageResponse = await postMarkdownImage(ctx, token, {
      fileName: "shot.png",
      contentType: "image/png",
      file: pngBuffer(),
      alt: "登录异常截图"
    });

    assert.equal(imageResponse.statusCode, 201);
    const data = imageResponse.json().data;
    assert.match(data.uploadId, /^upl_/);
    assert.equal(data.markdown, `![登录异常截图](/api/admin/uploads/${data.uploadId}/raw)`);
    assert.equal(data.upload.bucket, "temp");
    assert.equal(data.upload.category, "markdown");

    const row = getUploadRow(ctx, data.uploadId);
    assert.equal(row.bucket, "temp");
    assert.equal(row.category, "markdown");
    assert.equal(row.mime_type, "image/png");

    const textResponse = await postMarkdownImage(ctx, token, {
      fileName: "note.txt",
      contentType: "text/plain",
      file: Buffer.from("not image")
    });

    assert.equal(textResponse.statusCode, 400);
    assert.equal(textResponse.json().code, "VALIDATION_ERROR");
  });

  it("promotes uploaded markdown image when creating an issue", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["issue:create:write"]);
    const upload = await uploadMarkdownImage(ctx, token);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues`,
      headers: { authorization: `Bearer ${token}` },
      payload: createIssuePayload(ctx, {
        description: `复现截图：${upload.markdown}`
      })
    });

    assert.equal(response.statusCode, 201);
    const issue = response.json().data;
    const row = getUploadRow(ctx, upload.uploadId);
    assert.equal(row.bucket, "issues");
    assert.equal(row.category, "markdown");
    assert.match(row.storage_path, new RegExp(escapeRegExp(issue.id)));
  });

  it("promotes uploaded markdown image when adding an issue comment", async () => {
    const ctx = await createTestApp();
    const createToken = await createPersonalToken(ctx, ["issue:create:write"]);
    const commentToken = await createPersonalToken(ctx, ["issue:comment:write"]);
    const issue = await createIssueWithToken(ctx, createToken);
    const upload = await uploadMarkdownImage(ctx, commentToken);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/issues/${issue.id}/comments`,
      headers: { authorization: `Bearer ${commentToken}` },
      payload: {
        content: `补充评论图片：${upload.markdown}`
      }
    });

    assert.equal(response.statusCode, 201);
    const row = getUploadRow(ctx, upload.uploadId);
    assert.equal(row.bucket, "issues");
    assert.equal(row.category, "markdown");
    assert.match(row.storage_path, new RegExp(escapeRegExp(issue.id)));
  });

  it("promotes uploaded markdown image when creating an rd item", async () => {
    const ctx = await createTestApp();
    const token = await createPersonalToken(ctx, ["rd:create:write"]);
    const upload = await uploadMarkdownImage(ctx, token);

    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/personal/projects/${ctx.project.key}/rd-items`,
      headers: { authorization: `Bearer ${token}` },
      payload: createRdItemPayload(ctx, {
        description: `需求截图：${upload.markdown}`
      })
    });

    assert.equal(response.statusCode, 201);
    const item = response.json().data;
    const row = getUploadRow(ctx, upload.uploadId);
    assert.equal(row.bucket, "rd");
    assert.equal(row.category, "markdown");
    assert.match(row.storage_path, new RegExp(escapeRegExp(item.id)));
  });
});

async function createTestApp(): Promise<TestApp> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-v2-personal-upload-"));
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
  const project = { id: "prj_personal_upload", key: "personal-upload-project" };
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
    "UPLOAD-TOKEN",
    "UPL",
    "Personal Upload Project",
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
  ).run("pm_personal_upload_owner", project.id, userId, "Test Admin", "project_admin", 1, now, now, now);
  return project;
}

function seedStage(db: Database.Database, projectId: string): { id: string; name: string } {
  const now = new Date().toISOString();
  const stage = { id: "rds_personal_upload_requirement", name: "需求确认" };
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

async function createIssueWithToken(ctx: TestApp, token: string): Promise<{ id: string }> {
  const response = await ctx.app.inject({
    method: "POST",
    url: `/api/personal/projects/${ctx.project.key}/issues`,
    headers: { authorization: `Bearer ${token}` },
    payload: createIssuePayload(ctx)
  });
  assert.equal(response.statusCode, 201);
  return response.json().data;
}

async function uploadMarkdownImage(ctx: TestApp, token: string): Promise<{ uploadId: string; markdown: string }> {
  const response = await postMarkdownImage(ctx, token, {
    fileName: "shot.png",
    contentType: "image/png",
    file: pngBuffer()
  });
  assert.equal(response.statusCode, 201);
  return response.json().data;
}

async function postMarkdownImage(
  ctx: TestApp,
  token: string,
  input: { fileName: string; contentType: string; file: Buffer; alt?: string }
) {
  const boundary = `----hubv2upload${Date.now()}${Math.random().toString(16).slice(2)}`;
  const fields: Record<string, string> = input.alt ? { alt: input.alt } : {};
  const payload = buildMultipartPayload(boundary, fields, input.file, input.fileName, input.contentType);
  return ctx.app.inject({
    method: "POST",
    url: `/api/personal/projects/${ctx.project.key}/uploads/markdown`,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    payload
  });
}

function buildMultipartPayload(
  boundary: string,
  fields: Record<string, string>,
  file: Buffer,
  fileName: string,
  contentType: string
): Buffer {
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`
    )
  );
  chunks.push(file);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

function pngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function getUploadRow(ctx: TestApp, uploadId: string): {
  bucket: string;
  category: string;
  mime_type: string | null;
  storage_path: string;
} {
  return ctx.db
    .prepare("SELECT bucket, category, mime_type, storage_path FROM uploads WHERE id = ?")
    .get(uploadId) as {
      bucket: string;
      category: string;
      mime_type: string | null;
      storage_path: string;
    };
}

function countRows(db: Database.Database, tableName: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get() as { total: number };
  return row.total;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
