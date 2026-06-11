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
  it("auto-publishes uploaded skills and downloads the published package", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("hub-v2-docs", "Hub V2 Docs");

    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, {
      version: "0.1.0",
      category: "hub-v2",
      tags: "docs,api",
      descriptionMd: "## 使用说明\n\n上传后可在详情中查看。"
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    assert.equal(created.status, "published");
    assert.equal(created.slug, "hub-v2-docs");
    assert.equal(created.descriptionMd, "## 使用说明\n\n上传后可在详情中查看。");
    assert.equal(created.latestVersionId, created.versions[0].id);
    assert.equal(created.versions[0].status, "published");
    assert.equal(created.versions[0].manifest.validation.skillMdPath, "SKILL.md");

    const listResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills?keyword=docs&sort=hot",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().data.total, 1);

    const tagKeywordResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills?keyword=api",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(tagKeywordResponse.statusCode, 200);
    assert.equal(tagKeywordResponse.json().data.total, 1);

    const metaResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills/meta?keyword=docs",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(metaResponse.statusCode, 200);
    assert.deepEqual(metaResponse.json().data.categories, [{ name: "hub-v2", count: 1 }]);
    assert.deepEqual(metaResponse.json().data.tags, [
      { name: "api", count: 1 },
      { name: "docs", count: 1 }
    ]);

    const favoriteResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/admin/skills/${created.id}/favorite`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` },
      payload: { favorite: true }
    });
    assert.equal(favoriteResponse.statusCode, 200);
    assert.equal(favoriteResponse.json().data.isFavorited, true);
    assert.equal(favoriteResponse.json().data.favoriteCount, 1);

    const reviewResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/admin/skills/${created.id}/review`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` },
      payload: { rating: 5, comment: "useful skill" }
    });
    assert.equal(reviewResponse.statusCode, 200);
    assert.equal(reviewResponse.json().data.myRating, 5);
    assert.equal(reviewResponse.json().data.reviewCount, 1);
    assert.equal(reviewResponse.json().data.ratingAverage, 5);

    const exportResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/skills/${created.id}/versions/${created.versions[0].id}/export?target=codex`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(exportResponse.statusCode, 200);
    const exported = exportResponse.json().data;
    assert.equal(exported.target, "codex");
    assert.match(exported.content, /hub-v2-docs/);

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

  it("uses optional SKILL.md versions and rejects mismatched form versions", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("versioned-skill", "Versioned Skill", { version: "2.3.4" });

    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, {
      category: "hub-v2"
    });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    assert.equal(created.versions[0].version, "2.3.4");

    const mismatchZip = createSkillZip("mismatched-version-skill", "Mismatched Version Skill", { version: "1.2.3" });
    const mismatchResponse = await postSkillPackage(ctx, "/api/admin/skills", mismatchZip, {
      version: "1.2.4"
    });
    assert.equal(mismatchResponse.statusCode, 400);
    assert.equal(mismatchResponse.json().code, "VALIDATION_ERROR");

    const nextZip = createSkillZip("versioned-skill", "Versioned Skill", { version: "2.4.0" });
    const versionResponse = await postSkillPackage(ctx, `/api/admin/skills/${created.id}/versions`, nextZip, {});
    assert.equal(versionResponse.statusCode, 201);
    const versioned = versionResponse.json().data;
    assert.equal(versioned.status, "published");
    assert.ok(versioned.versions.some((item: { version: string; status: string }) => item.version === "2.4.0" && item.status === "published"));

    const wrongNameZip = createSkillZip("other-skill", "Other Skill", { version: "2.5.0" });
    const wrongNameResponse = await postSkillPackage(ctx, `/api/admin/skills/${created.id}/versions`, wrongNameZip, {});
    assert.equal(wrongNameResponse.statusCode, 400);
    assert.equal(wrongNameResponse.json().code, "SKILL_PACKAGE_INVALID");
    assert.match(wrongNameResponse.json().message, /other-skill/);
    assert.match(wrongNameResponse.json().message, /versioned-skill/);
  });

  it("updates supplemental markdown description when uploading a new skill version", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("described-skill", "Described Skill");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, {
      version: "1.0.0",
      descriptionMd: "初始说明"
    });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    assert.equal(created.descriptionMd, "初始说明");

    const versionResponse = await postSkillPackage(ctx, `/api/admin/skills/${created.id}/versions`, zip, {
      version: "1.0.1",
      descriptionMd: "## 新说明\n\n![截图](/api/admin/uploads/upl_demo/raw)"
    });
    assert.equal(versionResponse.statusCode, 201);
    assert.equal(versionResponse.json().data.descriptionMd, "## 新说明\n\n![截图](/api/admin/uploads/upl_demo/raw)");
    assert.equal(versionResponse.json().data.status, "published");
    assert.ok(versionResponse.json().data.versions.some((item: { version: string; status: string }) => item.version === "1.0.1" && item.status === "published"));
  });

  it("deletes pure draft skills and deactivates their package upload", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("draft-delete-skill", "Draft Delete Skill");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "0.1.0" });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    const packageUploadId = created.versions[0].packageUploadId;
    ctx.db.prepare("UPDATE skills SET status = 'draft', latest_version_id = NULL WHERE id = ?").run(created.id);
    ctx.db
      .prepare("UPDATE skill_versions SET status = 'draft', submitted_by_user_id = NULL, reviewed_by_user_id = NULL, published_at = NULL WHERE id = ?")
      .run(created.versions[0].id);

    const deleteResponse = await ctx.app.inject({
      method: "DELETE",
      url: `/api/admin/skills/${created.id}`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(deleteResponse.statusCode, 200);
    assert.equal(deleteResponse.json().data.id, created.id);

    const detailResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/skills/${created.id}`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(detailResponse.statusCode, 404);
    assert.equal(detailResponse.json().code, "SKILL_NOT_FOUND");

    const listResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills?status=draft&keyword=draft-delete",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().data.total, 0);

    const upload = ctx.db.prepare("SELECT status FROM uploads WHERE id = ?").get(packageUploadId) as { status: string };
    assert.equal(upload.status, "inactive");
  });

  it("deletes archived skills and deactivates their package upload", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("archived-delete-skill", "Archived Delete Skill");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "0.1.0" });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    const packageUploadId = created.versions[0].packageUploadId;

    const archiveResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/admin/skills/${created.id}/archive`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(archiveResponse.statusCode, 200);
    assert.equal(archiveResponse.json().data.status, "archived");

    const deleteResponse = await ctx.app.inject({
      method: "DELETE",
      url: `/api/admin/skills/${created.id}`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(deleteResponse.statusCode, 200);
    assert.equal(deleteResponse.json().data.id, created.id);

    const detailResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/skills/${created.id}`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(detailResponse.statusCode, 404);

    const upload = ctx.db.prepare("SELECT status FROM uploads WHERE id = ?").get(packageUploadId) as { status: string };
    assert.equal(upload.status, "inactive");
  });

  it("does not delete draft skills that already have submitted versions", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("submitted-delete-skill", "Submitted Delete Skill");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "0.1.0" });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    ctx.db.prepare("UPDATE skills SET status = 'draft', latest_version_id = NULL WHERE id = ?").run(created.id);
    ctx.db
      .prepare("UPDATE skill_versions SET status = 'submitted', submitted_by_user_id = ?, reviewed_by_user_id = NULL, published_at = NULL WHERE id = ?")
      .run(ctx.admin.userId, created.versions[0].id);

    const deleteResponse = await ctx.app.inject({
      method: "DELETE",
      url: `/api/admin/skills/${created.id}`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(deleteResponse.statusCode, 400);
    assert.equal(deleteResponse.json().code, "BAD_REQUEST");

    const submittedResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills?status=submitted&keyword=submitted-delete",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(submittedResponse.statusCode, 200);
    assert.equal(submittedResponse.json().data.total, 1);
    assert.equal(submittedResponse.json().data.items[0].id, created.id);
  });

  it("creates and lists skill comments", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("commented-skill", "Commented Skill");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "0.1.0" });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;

    const commentResponse = await ctx.app.inject({
      method: "POST",
      url: `/api/admin/skills/${created.id}/comments`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` },
      payload: {
        content: "这个 Skill 需要补充 Windows 使用截图。"
      }
    });
    assert.equal(commentResponse.statusCode, 201);
    assert.equal(commentResponse.json().data.skillId, created.id);
    assert.equal(commentResponse.json().data.authorName, ctx.admin.nickname);

    const listResponse = await ctx.app.inject({
      method: "GET",
      url: `/api/admin/skills/${created.id}/comments`,
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().data.items.length, 1);
    assert.equal(listResponse.json().data.items[0].content, "这个 Skill 需要补充 Windows 使用截图。");
  });

  it("rejects duplicate skill slugs and version rollback", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("hub-v2-api", "Hub V2 API");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "1.0.0" });
    const created = createResponse.json().data;

    const duplicateResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "1.0.1" });
    assert.equal(duplicateResponse.statusCode, 409);
    assert.equal(duplicateResponse.json().code, "SKILL_SLUG_EXISTS");

    const rollbackResponse = await postSkillPackage(ctx, `/api/admin/skills/${created.id}/versions`, zip, {
      version: "0.9.0"
    });
    assert.equal(rollbackResponse.statusCode, 409);
    assert.equal(rollbackResponse.json().code, "SKILL_VERSION_CONFLICT");
  });

  it("keeps other users' drafts out of review queues and lists submitted versions for reviewers", async () => {
    const ctx = await createTestApp();
    const zip = createSkillZip("shared-review-skill", "Shared Review Skill");
    const createResponse = await postSkillPackage(ctx, "/api/admin/skills", zip, { version: "0.1.0" });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json().data;
    ctx.db.prepare("UPDATE skills SET status = 'draft', latest_version_id = NULL WHERE id = ?").run(created.id);
    ctx.db
      .prepare("UPDATE skill_versions SET status = 'draft', submitted_by_user_id = NULL, reviewed_by_user_id = NULL, published_at = NULL WHERE id = ?")
      .run(created.versions[0].id);

    ctx.db.prepare(
      "INSERT INTO users (id, username, display_name, status, source, created_at, updated_at) VALUES (?, ?, ?, 'active', 'local', datetime('now'), datetime('now'))"
    ).run("usr_other_skill_owner", "other_skill_owner", "Other Skill Owner");
    ctx.db.prepare("UPDATE skills SET owner_user_id = ? WHERE id = ?").run("usr_other_skill_owner", created.id);

    const draftResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills?status=draft&keyword=review",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(draftResponse.statusCode, 200);
    assert.equal(draftResponse.json().data.total, 0);

    ctx.db
      .prepare("UPDATE skill_versions SET status = 'submitted', submitted_by_user_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run("usr_other_skill_owner", created.versions[0].id);

    const submittedResponse = await ctx.app.inject({
      method: "GET",
      url: "/api/admin/skills?status=submitted&keyword=review",
      headers: { authorization: `Bearer ${adminJwt(ctx)}` }
    });
    assert.equal(submittedResponse.statusCode, 200);
    assert.equal(submittedResponse.json().data.total, 1);
    assert.equal(submittedResponse.json().data.items[0].id, created.id);
    assert.equal(submittedResponse.json().data.items[0].status, "draft");
    assert.equal(submittedResponse.json().data.items[0].pendingReviewCount, 1);
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

function createSkillZip(name: string, title: string, options: { version?: string } = {}): Buffer {
  const versionLine = options.version ? `version: ${options.version}\n` : "";
  return createZip({
    "SKILL.md": `---\nname: ${name}\ndescription: ${title} skill package.\n${versionLine}---\n\n# ${title}\n\nUse this skill for tests.`,
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
