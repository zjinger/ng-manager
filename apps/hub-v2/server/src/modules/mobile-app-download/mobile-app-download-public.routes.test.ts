import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../app/build-container";
import type { AppConfig } from "../../shared/env/env";
import errorHandlerPlugin from "../../plugins/error-handler.plugin";
import type { ReleaseQueryContract } from "../release/release.contract";
import type { ReleaseEntity } from "../release/release.types";
import type { SharedConfigQueryContract } from "../shared-config/shared-config.contract";
import type { SharedConfigEntity } from "../shared-config/shared-config.types";
import type { UploadQueryContract } from "../upload/upload.contract";
import mobileAppDownloadPublicRoutes from "./mobile-app-download-public.routes";

type TestState = {
  configs?: SharedConfigEntity[];
  releases?: ReleaseEntity[];
  releaseQuery?: { channel?: string; page?: number; pageSize?: number };
  sharedConfigQuery?: { projectId?: string; category?: string };
};

const apps: FastifyInstance[] = [];

afterEach(async () => {
  while (apps.length > 0) {
    const app = apps.pop();
    if (app) {
      await app.close();
    }
  }
});

describe("mobile app download public routes", () => {
  it("returns 404 when the project has no enabled mobile app config", async () => {
    const state: TestState = {};
    const { app } = await createTestApp(state);

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, "MOBILE_APP_DOWNLOAD_NOT_CONFIGURED");
    assert.equal(state.sharedConfigQuery?.projectId, "proj_1");
    assert.equal(state.sharedConfigQuery?.category, "mobile-app-download");
  });

  it("combines project download config and public releases", async () => {
    const state: TestState = {
      configs: [
        createConfig({
          enabled: true,
          app: { channel: "hubv2-mobile", title: "深蓝协作平台 APP 下载" },
          current: { versionName: "1.0.0", versionCode: 1, publishedAt: "2026-06-12T00:00:00.000Z" },
          platforms: [
            {
              platform: "android",
              enabled: true,
              packageUploadId: "upl_android",
              packageName: "HubV2-v1.0.0.apk",
              versionName: "1.0.0",
              versionCode: 1,
              packageSizeBytes: 109320667,
              minOsVersion: "Android 10",
              checksum: { sha256: "sha256-android" },
              distributionType: "internal"
            }
          ],
          cache: { maxAgeSeconds: 300 }
        })
      ],
      releases: [
        createRelease({
          id: "rel_1",
          channel: "hubv2-mobile",
          version: "1.0.0",
          title: "Android 内测正式版",
          notes: "登录态恢复\n统一待办",
          publishedAt: "2026-06-12T00:00:00.000Z"
        })
      ]
    };
    const { app } = await createTestApp(state);

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "public, max-age=300");
    const data = response.json().data;
    assert.equal(data.configured, true);
    assert.equal(data.project.projectKey, "proj-key");
    assert.equal(data.app.title, "深蓝协作平台 APP 下载");
    assert.equal(data.current.versionName, "1.0.0");
    assert.equal(data.platforms[0].platform, "android");
    assert.equal(data.platforms[0].downloadUrl, "/api/public/mobile-app/projects/proj-key/packages/android/download");
    assert.equal(data.platforms[0].checksum.sha256, "sha256-from-upload");
    assert.equal(data.platforms[1].platform, "ios");
    assert.equal(data.platforms[1].enabled, false);
    assert.equal(data.releaseNotes[0].title, "Android 内测正式版");
    assert.deepEqual(data.releaseNotes[0].summary, ["登录态恢复", "统一待办"]);
    assert.equal(state.releaseQuery?.channel, "hubv2-mobile");
  });

  it("prefers release notes configured on the mobile app download config", async () => {
    const state: TestState = {
      configs: [
        createConfig({
          enabled: true,
          current: { versionName: "1.1.0", versionCode: 11 },
          platforms: [
            {
              platform: "android",
              enabled: true,
              packageUploadId: "upl_android",
              versionName: "1.1.0",
              versionCode: 11
            }
          ],
          releaseNotes: [
            {
              id: "manual_1",
              version: "1.1.0",
              title: "移动端 1.1.0",
              publishedAt: "2026-06-12",
              summary: ["新增扫码登录", "优化待办处理"],
              importantNotes: ["重要：需要 Android 10+"],
              downloadUrl: "https://example.com/archive/1.1.0"
            }
          ]
        })
      ],
      releases: [
        createRelease({
          id: "rel_should_not_be_used",
          version: "9.9.9",
          title: "不应展示"
        })
      ]
    };
    const { app } = await createTestApp(state);

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 200);
    const data = response.json().data;
    assert.equal(data.releaseNotes.length, 1);
    assert.equal(data.releaseNotes[0].id, "manual_1");
    assert.equal(data.releaseNotes[0].version, "1.1.0");
    assert.deepEqual(data.releaseNotes[0].summary, ["新增扫码登录", "优化待办处理"]);
    assert.deepEqual(data.releaseNotes[0].importantNotes, ["重要：需要 Android 10+"]);
    assert.equal(data.releaseNotes[0].downloadUrl, "https://example.com/archive/1.1.0");
    assert.equal(state.releaseQuery, undefined);
  });

  it("returns a stable error code for invalid JSON config", async () => {
    const { app } = await createTestApp({
      configs: [
        {
          ...createConfig({}),
          configValue: "{invalid"
        }
      ]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "MOBILE_APP_DOWNLOAD_CONFIG_INVALID");
  });
});

async function createTestApp(state: TestState) {
  const app = Fastify({ logger: false });
  const db = createDb();
  app.decorate("db", db);
  app.decorate("config", { uploadDir: "", uploadMaxFileSize: 1024 * 1024 * 200 } as AppConfig);
  app.decorate("container", createContainer(state));
  await app.register(errorHandlerPlugin);
  await app.register(mobileAppDownloadPublicRoutes, { prefix: "/api/public" });
  await app.ready();
  apps.push(app);
  return { app };
}

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
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
    INSERT INTO projects (
      id, project_key, project_no, display_code, name, description, icon, avatar_upload_id,
      project_type, contract_no, delivery_date, product_line, sla_level, status, visibility, created_at, updated_at
    ) VALUES (
      'proj_1', 'proj-key', 'P-001', NULL, '深蓝协作平台 APP', NULL, NULL, NULL,
      'self_dev', NULL, NULL, NULL, NULL, 'active', 'internal', '2026-06-12T00:00:00.000Z', '2026-06-12T00:00:00.000Z'
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

function createContainer(state: TestState): AppContainer {
  const sharedConfigQuery: SharedConfigQueryContract = {
    async list(query) {
      state.sharedConfigQuery = query;
      return {
        items: state.configs ?? [],
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total: state.configs?.length ?? 0
      };
    },
    async listPublic() {
      throw new Error("not implemented");
    },
    async getById() {
      throw new Error("not implemented");
    }
  };
  const releaseQuery: ReleaseQueryContract = {
    async listPublic(query) {
      state.releaseQuery = query;
      return {
        items: state.releases ?? [],
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 10,
        total: state.releases?.length ?? 0
      };
    },
    async list() {
      throw new Error("not implemented");
    },
    async getById() {
      throw new Error("not implemented");
    },
    async listRecentPublishedForNotifications() {
      throw new Error("not implemented");
    },
    async listRecentArchivedForNotifications() {
      throw new Error("not implemented");
    }
  };
  const uploadQuery: UploadQueryContract = {
    async getById(id) {
      if (id !== "upl_android") {
        throw new Error("upload not found");
      }
      return {
        id,
        bucket: "mobile-apps",
        category: "package",
        fileName: "android.apk",
        originalName: "HubV2-v1.0.0.apk",
        fileExt: ".apk",
        mimeType: "application/vnd.android.package-archive",
        fileSize: 109320667,
        checksum: "sha256-from-upload",
        storageProvider: "local",
        storagePath: "android.apk",
        visibility: "private",
        status: "active",
        uploaderId: "u_1",
        uploaderName: "tester",
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z"
      };
    }
  };

  return { sharedConfigQuery, releaseQuery, uploadQuery } as unknown as AppContainer;
}

function createConfig(value: unknown): SharedConfigEntity {
  return {
    id: "cfg_1",
    projectId: "proj_1",
    scope: "project",
    configKey: "mobile-app.download",
    configName: "移动端 APP 下载配置",
    category: "mobile-app-download",
    valueType: "json",
    configValue: JSON.stringify(value),
    description: null,
    isEncrypted: false,
    priority: 100,
    status: "active",
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z"
  };
}

function createRelease(input: Partial<ReleaseEntity>): ReleaseEntity {
  return {
    id: input.id ?? "rel_1",
    projectId: null,
    channel: input.channel ?? "mobile-app",
    version: input.version ?? "1.0.0",
    title: input.title ?? "发布",
    notes: input.notes ?? null,
    downloadUrl: input.downloadUrl ?? null,
    syncToProjectVersion: false,
    status: "published",
    publishedAt: input.publishedAt ?? "2026-06-12T00:00:00.000Z",
    createdBy: null,
    deletedAt: null,
    deletedBy: null,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z"
  };
}
