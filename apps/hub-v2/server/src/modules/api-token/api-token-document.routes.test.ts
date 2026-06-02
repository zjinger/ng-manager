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
import type { ApiTokenScope } from "./api-token.types";

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
  otherProject: {
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

describe("project token document routes", () => {
  it("lists project documents with docs:read and defaults to active statuses", async () => {
    const ctx = await createTestApp();
    const token = await createProjectToken(ctx, ["docs:read"]);
    const draft = await createDocument(ctx, "token-doc-draft", "Token Doc Draft");
    const published = await createDocument(ctx, "token-doc-published", "Token Doc Published");
    const archived = await createDocument(ctx, "token-doc-archived", "Token Doc Archived");
    await ctx.app.container.documentCommand.publish(published.id, requestContext(ctx));
    await ctx.app.container.documentCommand.archive(archived.id, requestContext(ctx));

    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/token/projects/${ctx.project.key}/docs?page=1&pageSize=20`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.code, "OK");
    const ids = payload.data.items.map((item: { id: string }) => item.id);
    assert.deepEqual(new Set(ids), new Set([draft.id, published.id]));
    assert.equal(payload.data.total, 2);
    assert.ok(!ids.includes(archived.id));
    assert.equal("contentMd" in payload.data.items[0], false);
    assert.equal(payload.data.items.find((item: { id: string }) => item.id === draft.id).createdByName, "Test Admin");
  });

  it("supports archived status, categoryId alias, detail and slug reads", async () => {
    const ctx = await createTestApp();
    const token = await createProjectToken(ctx, ["docs:read"]);
    const archived = await createDocument(ctx, "archived-token-doc", "Archived Token Doc", {
      category: "token-read",
      contentMd: "# Archived\n\nBody for token read."
    });
    await ctx.app.container.documentCommand.archive(archived.id, requestContext(ctx));

    const listResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/token/projects/${ctx.project.key}/docs?status=archived&categoryId=token-read`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().data.total, 1);
    assert.equal(listResponse.json().data.items[0].id, archived.id);
    assert.equal("contentMd" in listResponse.json().data.items[0], false);

    const detailResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/token/projects/${ctx.project.key}/docs/${archived.id}`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.json().data.contentMd, "# Archived\n\nBody for token read.");
    assert.equal(detailResponse.json().data.category, "token-read");

    const slugResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/token/projects/${ctx.project.key}/docs/by-slug/${archived.slug}`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(slugResponse.statusCode, 200);
    assert.equal(slugResponse.json().data.id, archived.id);
  });

  it("omits document markdown content from admin list responses", async () => {
    const ctx = await createTestApp();
    const document = await createDocument(ctx, "admin-list-light-doc", "Admin List Light Doc", {
      contentMd: "# Admin List\n\nLarge markdown content should stay out of list payloads."
    });

    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/documents?page=1&pageSize=20&projectId=${ctx.project.id}&statusGroup=active`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });

    assert.equal(response.statusCode, 200);
    const item = response.json().data.items.find((entry: { id: string }) => entry.id === document.id);
    assert.ok(item);
    assert.equal("contentMd" in item, false);
    assert.equal(item.createdByName, "Test Admin");

    const detailResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/documents/${document.id}`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });

    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.json().data.contentMd, "# Admin List\n\nLarge markdown content should stay out of list payloads.");
  });

  it("rejects missing docs:read scope", async () => {
    const ctx = await createTestApp();
    const token = await createProjectToken(ctx, ["issues:read"]);

    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/token/projects/${ctx.project.key}/docs`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "TOKEN_SCOPE_FORBIDDEN");
  });

  it("keeps project token reads scoped to the token project", async () => {
    const ctx = await createTestApp();
    const token = await createProjectToken(ctx, ["docs:read"]);
    const otherDoc = await createDocument(ctx, "other-project-doc", "Other Project Doc", {
      projectId: ctx.otherProject.id
    });

    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/token/projects/${ctx.otherProject.key}/docs/${otherDoc.id}`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "TOKEN_PROJECT_FORBIDDEN");

    const sameProjectRouteResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/token/projects/${ctx.project.key}/docs/${otherDoc.id}`,
      headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(sameProjectRouteResponse.statusCode, 404);
    assert.equal(sameProjectRouteResponse.json().code, "DOCUMENT_NOT_FOUND");
  });
});

async function createTestApp(): Promise<TestApp> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-v2-api-token-doc-"));
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
  const project = seedProject(db, adminRow.user_id, "prj_api_token_doc", "api-token-doc-project", "DOC-TOKEN");
  const otherProject = seedProject(db, adminRow.user_id, "prj_api_token_other", "api-token-other-project", "DOC-OTHER");
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
    otherProject
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
  id: string,
  key: string,
  projectNo: string
): { id: string; key: string } {
  const now = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO projects (
        id, project_key, project_no, display_code, name, description, icon,
        avatar_upload_id, project_type, contract_no, delivery_date, product_line,
        sla_level, status, visibility, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    id,
    key,
    projectNo,
    projectNo,
    projectNo,
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
  ).run(`pm_${id}`, id, userId, "Test Admin", "project_admin", 1, now, now, now);
  return { id, key };
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

function adminJwt(ctx: TestApp): string {
  return ctx.app.jwt.sign({
    accountId: ctx.admin.accountId,
    userId: ctx.admin.userId,
    nickname: ctx.admin.nickname,
    role: "admin"
  });
}

async function createProjectToken(ctx: TestApp, scopes: ApiTokenScope[]): Promise<string> {
  const result = await ctx.app.container.apiTokenCommand.createProjectToken(
    {
      projectKey: ctx.project.key,
      name: `project-${scopes.join("-")}`,
      scopes,
      expiresAt: null
    },
    requestContext(ctx)
  );
  return result.token;
}

async function createDocument(
  ctx: TestApp,
  slug: string,
  title: string,
  options: { projectId?: string; category?: string; contentMd?: string } = {}
) {
  return ctx.app.container.documentCommand.create(
    {
      projectId: options.projectId ?? ctx.project.id,
      slug,
      title,
      category: options.category ?? "general",
      summary: `${title} summary`,
      contentMd: options.contentMd ?? `# ${title}\n\nToken document content.`
    },
    requestContext(ctx)
  );
}
