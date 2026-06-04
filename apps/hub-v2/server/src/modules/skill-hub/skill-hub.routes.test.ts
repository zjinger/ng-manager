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
import type { AppConfig } from "../../shared/env/env";

const JSZip = require("jszip") as {
  new (): {
    file(name: string, content: string): void;
    generate(options: { type: "nodebuffer" }): Buffer;
  };
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

describe("skill hub routes", () => {
  it("creates a draft skill, publishes it, and downloads the published package", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("hub-v2-docs", "Hub V2 Docs");

    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, {
      version: "0.1.0",
      category: "hub-v2",
      tags: "docs,api"
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    assert.equal(created.status, "draft");
    assert.equal(created.slug, "hub-v2-docs");
    assert.equal(created.versions[0].status, "draft");
    assert.equal(created.versions[0].manifest.validation.skillMdPath, "SKILL.md");

    const draftDownload = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/skills/${created.id}/versions/${created.versions[0].id}/download`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(draftDownload.statusCode, 404);
    assert.equal(draftDownload.json().code, "SKILL_NOT_FOUND");

    const submitResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/admin/skills/${created.id}/versions/${created.versions[0].id}/submit`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(submitResponse.statusCode, 200);
    assert.equal(submitResponse.json().data.status, "submitted");

    const publishResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/admin/skills/${created.id}/versions/${created.versions[0].id}/publish`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(publishResponse.statusCode, 200);
    assert.equal(publishResponse.json().data.status, "published");
    assert.equal(publishResponse.json().data.latestVersionId, created.versions[0].id);

    const listResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills?keyword=docs",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().data.total, 1);

    const downloadResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/skills/${created.id}/versions/${created.versions[0].id}/download`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(downloadResponse.statusCode, 200);
    assert.equal(downloadResponse.headers["content-type"], "application/zip");
    assert.ok(Buffer.isBuffer(downloadResponse.rawPayload));
    assert.ok(downloadResponse.rawPayload.length > 0);
  });

  it("rejects packages without SKILL.md", async () => {
    const ctx = await createTestApp();
    const zip = createZip({ "README.md": "# Missing skill" });

    const response = await postSkillPackage(ctx, "/api/admin/skills", zip, {
      version: "0.1.0"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "SKILL_PACKAGE_INVALID");
  });

  it("rejects duplicate skill slugs and version rollback", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("hub-v2-api", "Hub V2 API");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "1.0.0" });
    const created = createResponse.json().data;

    const duplicateResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "1.0.1" });
    assert.equal(duplicateResponse.statusCode, 409);
    assert.equal(duplicateResponse.json().code, "SKILL_SLUG_EXISTS");

    await ctx.app.inject({
      method: "POST",
      url: `/api/admin/skills/${created.id}/versions/${created.versions[0].id}/publish`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });

    const rollbackResponse = await postSkillPackage(ctx, `/api/admin/skills/${created.id}/versions`, zip, {
      version: "0.9.0"
    });
    assert.equal(rollbackResponse.statusCode, 409);
    assert.equal(rollbackResponse.json().code, "SKILL_VERSION_CONFLICT");
  });

  it("rejects unauthenticated skill list reads", async () => {
    const ctx = await createTestApp();
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills"
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, "AUTH_UNAUTHORIZED");
  });
});

async function createTestApp(): Promise<TestApp> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-v2-skill-hub-"));
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
  const ctx = {
    app,
    db,
    tempDir,
    admin: {
      accountId: adminRow.id,
      userId: adminRow.user_id,
      nickname: adminRow.nickname
    }
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

function adminJwt(ctx: TestApp): string {
  return ctx.app.jwt.sign({
    accountId: ctx.admin.accountId,
    userId: ctx.admin.userId,
    nickname: ctx.admin.nickname,
    role: "admin"
  });
}

function createSkillZip(name: string, title: string): Buffer {
  return createZip({
    "SKILL.md": `---\nname: ${name}\ndescription: ${title} skill package.\n---\n\n# ${title}\n\nUse this skill for tests.`,
    "references/api.md": "# API\n",
    "scripts/helper.py": "print('ok')\n"
  });
}

function createZip(files: Record<string, string>): Buffer {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generate({ type: "nodebuffer" });
}

async function postSkillPackage(ctx: TestApp, url: string, zip: Buffer, fields: Record<string, string>) {
  const boundary = `----hubv2skill${Date.now()}${Math.random().toString(16).slice(2)}`;
  const payload = buildMultipartPayload(boundary, fields, zip);
  return ctx.app.inject({
    method: "POST",
    url,
    headers: {
      authorization: `Bearer ${adminJwt(ctx)}`,
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    payload
  });
}

function buildMultipartPayload(boundary: string, fields: Record<string, string>, file: Buffer): Buffer {
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="skill.zip"\r\nContent-Type: application/zip\r\n\r\n`
    )
  );
  chunks.push(file);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}
