import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createRequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { ProjectRepo } from "../project/project.repo";
import { UserRepo } from "../user/user.repo";
import { PersonalTokenRepo } from "./personal-token.repo";
import { createPersonalTokenSchema } from "./personal-token.schema";
import { PersonalTokenService } from "./personal-token.service";

const cleanup: Database.Database[] = [];

afterEach(() => {
  while (cleanup.length > 0) {
    cleanup.pop()?.close();
  }
});

describe("PersonalTokenService.deleteRevoked", () => {
  it("deletes revoked personal token records owned by the current user", async () => {
    const service = createService();
    const ctx = createUserContext("usr_1");
    const created = await service.create(
      {
        name: "local automation",
        scopes: ["doc:create:write"],
        expiresAt: null
      },
      ctx
    );

    await service.revoke(created.entity.id, ctx);
    await service.deleteRevoked(created.entity.id, ctx);

    const tokens = await service.list(ctx);
    assert.equal(tokens.items.length, 0);
  });

  it("rejects deleting active tokens", async () => {
    const service = createService();
    const ctx = createUserContext("usr_1");
    const created = await service.create(
      {
        name: "local automation",
        scopes: ["doc:create:write"],
        expiresAt: null
      },
      ctx
    );

    await assert.rejects(
      () => service.deleteRevoked(created.entity.id, ctx),
      (error) =>
        error instanceof AppError &&
        error.code === ERROR_CODES.BAD_REQUEST &&
        error.statusCode === 400
    );
  });

  it("does not allow deleting another user's revoked token", async () => {
    const service = createService();
    const ownerCtx = createUserContext("usr_1");
    const otherCtx = createUserContext("usr_2");
    const created = await service.create(
      {
        name: "local automation",
        scopes: ["doc:create:write"],
        expiresAt: null
      },
      ownerCtx
    );

    await service.revoke(created.entity.id, ownerCtx);

    await assert.rejects(
      () => service.deleteRevoked(created.entity.id, otherCtx),
      (error) =>
        error instanceof AppError &&
        error.code === ERROR_CODES.TOKEN_NOT_FOUND &&
        error.statusCode === 404
    );

    const tokens = await service.list(ownerCtx);
    assert.equal(tokens.items.length, 1);
    assert.equal(tokens.items[0]?.status, "revoked");
  });
});

describe("PersonalTokenService.create", () => {
  it("rejects the removed rd delete scope at schema and service level", async () => {
    assert.throws(() =>
      createPersonalTokenSchema.parse({
        name: "invalid rd delete",
        scopes: ["rd:delete:write"],
        expiresAt: null
      })
    );

    const service = createService();
    const ctx = createUserContext("usr_1");
    await assert.rejects(
      () =>
        service.create(
          {
            name: "invalid rd delete",
            scopes: ["rd:delete:write"] as any,
            expiresAt: null
          },
          ctx
        ),
      (error) =>
        error instanceof AppError &&
        error.code === ERROR_CODES.TOKEN_SCOPE_REQUIRED &&
        error.statusCode === 400
    );
  });

  it("allows up to five personal tokens for the same user", async () => {
    const service = createService();
    const ctx = createUserContext("usr_1");

    for (let index = 1; index <= 5; index += 1) {
      const created = await createToken(service, ctx, `token ${index}`);
      assert.equal(created.entity.ownerUserId, "usr_1");
    }

    const tokens = await service.list(ctx);
    assert.equal(tokens.items.length, 5);
  });

  it("rejects the sixth personal token for the same user", async () => {
    const service = createService();
    const ctx = createUserContext("usr_1");

    for (let index = 1; index <= 5; index += 1) {
      await createToken(service, ctx, `token ${index}`);
    }

    await assert.rejects(
      () => createToken(service, ctx, "token 6"),
      (error) =>
        error instanceof AppError &&
        error.code === ERROR_CODES.TOKEN_LIMIT_EXCEEDED &&
        error.statusCode === 409 &&
        error.details?.["limit"] === 5
    );
  });

  it("counts revoked tokens until their records are deleted", async () => {
    const service = createService();
    const ctx = createUserContext("usr_1");
    let revokedTokenId = "";

    for (let index = 1; index <= 5; index += 1) {
      const created = await createToken(service, ctx, `token ${index}`);
      if (index === 1) {
        revokedTokenId = created.entity.id;
      }
    }

    await service.revoke(revokedTokenId, ctx);

    await assert.rejects(
      () => createToken(service, ctx, "token 6"),
      (error) =>
        error instanceof AppError &&
        error.code === ERROR_CODES.TOKEN_LIMIT_EXCEEDED &&
        error.statusCode === 409
    );

    await service.deleteRevoked(revokedTokenId, ctx);
    const createdAfterDelete = await createToken(service, ctx, "token 6");
    assert.equal(createdAfterDelete.entity.ownerUserId, "usr_1");
  });

  it("does not count another user's personal tokens", async () => {
    const service = createService();
    const ownerCtx = createUserContext("usr_1");
    const otherCtx = createUserContext("usr_2");

    for (let index = 1; index <= 5; index += 1) {
      await createToken(service, otherCtx, `other token ${index}`);
    }

    const created = await createToken(service, ownerCtx, "owner token");
    assert.equal(created.entity.ownerUserId, "usr_1");
  });
});

describe("PersonalTokenService.getProjectCapabilities", () => {
  it("does not expose rd delete capability or count the removed scope as writable", () => {
    const { service, db } = createServiceWithDb();
    seedProject(db, "usr_1");

    const ctx = createPersonalTokenContext("usr_1", ["rd:delete:write"]);
    const caps = service.getProjectCapabilities("project-key", ctx);

    assert.deepEqual(caps.scopes.rd, {
      canCreateRdItem: false,
      canUpdateProgress: false,
      canCreateRdStageTask: false,
      canTransition: false,
      canEdit: false
    });
    assert.equal(Object.prototype.hasOwnProperty.call(caps.scopes.rd, "canDelete"), false);
    assert.deepEqual(caps.scopes.all, []);
    assert.equal(caps.writable, false);
    assert.equal(caps.readOnlyReason, "scope_missing");
  });

  it("exposes issue create as an independent writable capability", () => {
    const { service, db } = createServiceWithDb();
    seedProject(db, "usr_1");

    const ctx = createPersonalTokenContext("usr_1", ["issue:create:write"]);
    const caps = service.getProjectCapabilities("project-key", ctx);

    assert.deepEqual(caps.scopes.issue, {
      canCreate: true,
      canComment: false,
      canTransition: false,
      canAssign: false,
      canManageBranches: false,
      canManageParticipants: false
    });
    assert.equal(caps.writable, true);
    assert.equal(caps.readOnlyReason, null);
  });

  it("keeps rd edit as a writable capability", () => {
    const { service, db } = createServiceWithDb();
    seedProject(db, "usr_1");

    const ctx = createPersonalTokenContext("usr_1", ["rd:edit:write"]);
    const caps = service.getProjectCapabilities("project-key", ctx);

    assert.deepEqual(caps.scopes.rd, {
      canCreateRdItem: false,
      canUpdateProgress: false,
      canCreateRdStageTask: false,
      canTransition: false,
      canEdit: true
    });
    assert.equal(caps.writable, true);
    assert.equal(caps.readOnlyReason, null);
  });

  it("exposes rd create and stage task write capabilities independently", () => {
    const { service, db } = createServiceWithDb();
    seedProject(db, "usr_1");

    const ctx = createPersonalTokenContext("usr_1", ["rd:create:write", "rd:stage-task:write"]);
    const caps = service.getProjectCapabilities("project-key", ctx);

    assert.deepEqual(caps.scopes.rd, {
      canCreateRdItem: true,
      canUpdateProgress: false,
      canCreateRdStageTask: true,
      canTransition: false,
      canEdit: false
    });
    assert.equal(caps.writable, true);
    assert.equal(caps.readOnlyReason, null);
  });
});

describe("0070_remove_rd_delete_personal_scope migration", () => {
  it("removes rd:delete:write from historical personal token scope JSON", () => {
    const db = createDb();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO personal_api_tokens (
        id, owner_user_id, name, token_prefix, token_hash, scopes_json, status, expires_at, last_used_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, NULL, ?, ?)
      `
    ).run(
      "uptk_legacy",
      "usr_1",
      "legacy",
      "ngm_uptk_legacy1",
      "hash",
      JSON.stringify(["rd:delete:write", "rd:edit:write"]),
      now,
      now
    );

    const migration = fs.readFileSync(
      path.resolve(__dirname, "../../db/migrations/0070_remove_rd_delete_personal_scope.sql"),
      "utf8"
    );
    db.exec(migration);

    const row = db.prepare("SELECT scopes_json FROM personal_api_tokens WHERE id = ?").get("uptk_legacy") as { scopes_json: string };
    assert.deepEqual(JSON.parse(row.scopes_json), ["rd:edit:write"]);
  });
});

function createService(): PersonalTokenService {
  return createServiceWithDb().service;
}

function createServiceWithDb(): { service: PersonalTokenService; db: Database.Database } {
  const db = createDb();
  return {
    service: new PersonalTokenService(
      new PersonalTokenRepo(db),
      new ProjectRepo(db),
      new UserRepo(db)
    ),
    db
  };
}

function createDb(): Database.Database {
  const db = new Database(":memory:");
  cleanup.push(db);
  db.exec(`
    CREATE TABLE personal_api_tokens (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token_prefix TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      scopes_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
      expires_at TEXT,
      last_used_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      project_key TEXT NOT NULL,
      project_no TEXT NOT NULL,
      display_code TEXT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      avatar_upload_id TEXT,
      project_type TEXT NOT NULL,
      contract_no TEXT,
      delivery_date TEXT,
      product_line TEXT,
      sla_level TEXT,
      status TEXT NOT NULL,
      visibility TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role_code TEXT NOT NULL,
      is_owner INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
}

function createUserContext(userId: string) {
  return createRequestContext({
    accountId: userId,
    userId,
    authType: "user",
    source: "http"
  });
}

function createPersonalTokenContext(userId: string, scopes: string[]) {
  return createRequestContext({
    accountId: "uptk_test",
    userId,
    authType: "personal_token",
    authScopes: scopes,
    source: "http"
  });
}

function seedProject(db: Database.Database, userId: string): void {
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
    "prj_test",
    "project-key",
    "PRJ",
    "PRJ",
    "Project",
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
      id, project_id, user_id, display_name, role_code, is_owner, joined_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run("pm_test", "prj_test", userId, "User", "project_admin", 1, now, now, now);
}

function createToken(service: PersonalTokenService, ctx: ReturnType<typeof createUserContext>, name: string) {
  return service.create(
    {
      name,
      scopes: ["doc:create:write"],
      expiresAt: null
    },
    ctx
  );
}
