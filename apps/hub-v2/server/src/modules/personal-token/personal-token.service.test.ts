import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import { createRequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { ProjectRepo } from "../project/project.repo";
import { UserRepo } from "../user/user.repo";
import { PersonalTokenRepo } from "./personal-token.repo";
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

function createService(): PersonalTokenService {
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
  `);

  return new PersonalTokenService(
    new PersonalTokenRepo(db),
    new ProjectRepo(db),
    new UserRepo(db)
  );
}

function createUserContext(userId: string) {
  return createRequestContext({
    accountId: userId,
    userId,
    authType: "user",
    source: "http"
  });
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
