import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { ErrorReportRepo } from "./error-report.repo";
import { ErrorReportService } from "./error-report.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE client_error_reports (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      source TEXT,
      lineno INTEGER,
      colno INTEGER,
      url TEXT,
      route TEXT,
      user_agent TEXT,
      ip TEXT,
      app_version TEXT,
      build_hash TEXT,
      user_id TEXT,
      username TEXT,
      request_method TEXT,
      request_url TEXT,
      status_code INTEGER,
      extra_json TEXT,
      fingerprint TEXT NOT NULL UNIQUE,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

function createService(db = createDb()) {
  return new ErrorReportService(new ErrorReportRepo(db));
}

describe("ErrorReportService", () => {
  it("merges reports with the same fingerprint", () => {
    const service = createService();
    const first = service.submit(
      {
        level: "error",
        type: "runtime",
        message: "Cannot read properties of undefined",
        stack: "Error: Cannot read\n  at foo\n  at bar\n  at baz",
        source: "/main.js",
        route: "/dashboard"
      },
      { userAgent: "node-test", ip: "10.0.0.1", userId: "usr_1", username: "admin" }
    );
    const second = service.submit(
      {
        level: "error",
        type: "runtime",
        message: "Cannot read properties of undefined",
        stack: "Error: Cannot read\n  at foo\n  at bar\n  at baz",
        source: "/main.js",
        route: "/dashboard"
      },
      { userAgent: "node-test", ip: "10.0.0.1", userId: "usr_1", username: "admin" }
    );

    assert.equal(first.id, second.id);
    assert.equal(second.occurrenceCount, 2);
    assert.equal(service.list({ page: 1, pageSize: 20 }).total, 1);
  });

  it("redacts sensitive query and extra fields", () => {
    const service = createService();
    const item = service.submit(
      {
        level: "error",
        type: "http",
        message: "HTTP 500",
        url: "https://hub.local/projects?token=abc&keyword=demo",
        requestUrl: "/api/admin/projects?password=secret&keyword=demo",
        route: "/projects?auth=hidden",
        extra: {
          visible: "ok",
          apiToken: "raw-token",
          callbackUrl: "/next?secret=value&keyword=demo"
        }
      },
      { userAgent: "node-test", ip: "10.0.0.1" }
    );

    assert.match(item.url ?? "", /token=%5BREDACTED%5D/);
    assert.match(item.requestUrl ?? "", /password=%5BREDACTED%5D/);
    assert.match(item.route ?? "", /auth=%5BREDACTED%5D/);
    assert.match(item.extraJson ?? "", /"apiToken":"\[REDACTED\]"/);
    assert.doesNotMatch(item.extraJson ?? "", /raw-token/);
    assert.match(item.extraJson ?? "", /"visible":"ok"/);
  });
});
