import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../app/build-container";
import type { AppConfig } from "../../shared/env/env";
import errorHandlerPlugin from "../../plugins/error-handler.plugin";
import type { SharedConfigQueryContract } from "../shared-config/shared-config.contract";
import type { SharedConfigEntity } from "../shared-config/shared-config.types";
import type { UploadQueryContract } from "../upload/upload.contract";
import type { MobileAppVersionCommandContract, MobileAppVersionQueryContract } from "./mobile-app-version.contract";
import type { MobileAppVersionEntity } from "./mobile-app-version.types";
import mobileAppDownloadPublicRoutes from "./mobile-app-download-public.routes";

type TestState = {
  configs?: SharedConfigEntity[];
  versions?: MobileAppVersionEntity[];
  downloads?: Array<{ projectId: string; versionId: string }>;
  uploadDir?: string;
};

const apps: FastifyInstance[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  while (apps.length > 0) {
    const app = apps.pop();
    if (app) {
      await app.close();
    }
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
});

describe("mobile app download public routes", () => {
  it("returns 404 when the project has no published mobile app version", async () => {
    const { app } = await createTestApp({});

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, "MOBILE_APP_DOWNLOAD_NOT_CONFIGURED");
  });

  it("returns 404 when portal public access is disabled", async () => {
    const { app } = await createTestApp({
      versions: [createVersion({ platform: "android" })],
      configs: [createPortalSettings({ enabled: false })]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, "MOBILE_APP_DOWNLOAD_NOT_CONFIGURED");
  });

  it("returns public download data from latest published versions and portal settings", async () => {
    const version = createVersion({ platform: "android" });
    const { app } = await createTestApp({
      versions: [version],
      configs: [
        createPortalSettings({
          name: "深蓝协作平台",
          subtitle: "移动协作入口",
          description: "统一待办、Issue 和研发项的移动端入口。",
          showInstallGuide: true
        })
      ]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "public, max-age=120");
    const data = response.json().data;
    assert.equal(data.project.projectKey, "proj-key");
    assert.equal(data.app.name, "深蓝协作平台");
    assert.equal(data.app.subtitle, "移动协作入口");
    assert.equal(data.current.versionName, "1.2.0");
    assert.equal(data.platforms[0].platform, "android");
    assert.equal(data.platforms[0].downloadUrl, "/api/public/mobile-app/projects/proj-key/packages/android/download");
    assert.equal(data.platforms[0].checksum.sha256, "sha256-android");
    assert.equal(data.platforms[1].platform, "ios");
    assert.equal(data.platforms[1].enabled, false);
    assert.equal(data.releaseNotes[0].title, "Android 1.2.0");
    assert.deepEqual(data.releaseNotes[0].summary, ["统一待办入口", "修复推送问题"]);
    assert.equal(data.installSteps.length > 0, true);
  });

  it("returns a stable error code for invalid portal settings", async () => {
    const { app } = await createTestApp({
      versions: [createVersion({ platform: "android" })],
      configs: [
        {
          ...createPortalSettings({}),
          configValue: "{invalid"
        }
      ]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/download"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "MOBILE_APP_PORTAL_SETTINGS_INVALID");
  });

  it("streams the latest published package and records a download", async () => {
    const uploadDir = mkdtempSync(path.join(os.tmpdir(), "hub-v2-mobile-app-"));
    tempDirs.push(uploadDir);
    const filePath = path.join(uploadDir, "android.apk");
    writeFileSync(filePath, "apk-content");
    const version = createVersion({ platform: "android", packageUploadId: "upl_android", storagePath: filePath });
    const state: TestState = { versions: [version], configs: [createPortalSettings({})], downloads: [], uploadDir };
    const { app } = await createTestApp(state);

    const response = await app.inject({
      method: "GET",
      url: "/api/public/mobile-app/projects/proj-key/packages/android/download"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, "apk-content");
    assert.deepEqual(state.downloads, [{ projectId: "proj_1", versionId: version.id }]);
  });
});

async function createTestApp(state: TestState) {
  const app = Fastify({ logger: false });
  const db = createDb();
  app.decorate("db", db);
  app.decorate("config", { uploadDir: state.uploadDir ?? "", uploadMaxFileSize: 1024 * 1024 * 200 } as AppConfig);
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
  const mobileAppVersionQuery: MobileAppVersionQueryContract = {
    async listVersions() {
      return state.versions ?? [];
    },
    async getVersion() {
      throw new Error("not implemented");
    },
    async getLatestPublishedVersion(_projectId, platform) {
      return (
        state.versions
          ?.filter((item) => item.platform === platform && item.status === "published")
          .sort((a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt))[0] ?? null
      );
    },
    async listPublishedVersions() {
      return (state.versions ?? [])
        .filter((item) => item.status === "published")
        .sort((a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt));
    },
    async listReleaseRecords() {
      return [];
    },
    async getStats() {
      throw new Error("not implemented");
    },
    async getPortalSettings() {
      throw new Error("not implemented");
    }
  };
  const mobileAppVersionCommand: MobileAppVersionCommandContract = {
    async createVersion() {
      throw new Error("not implemented");
    },
    async updateVersion() {
      throw new Error("not implemented");
    },
    async deleteVersion() {
      throw new Error("not implemented");
    },
    async publishVersion() {
      throw new Error("not implemented");
    },
    async archiveVersion() {
      throw new Error("not implemented");
    },
    async recordDownload(projectId, versionId) {
      state.downloads?.push({ projectId, versionId });
    },
    async updatePortalSettings() {
      throw new Error("not implemented");
    }
  };
  const uploadQuery: UploadQueryContract = {
    async getById(id) {
      const version = state.versions?.find((item) => item.packageUploadId === id);
      if (!version) {
        throw new Error("upload not found");
      }
      return {
        id,
        bucket: "mobile-apps",
        category: "package",
        fileName: version.platform === "android" ? "android.apk" : "ios.ipa",
        originalName: version.packageName,
        fileExt: version.platform === "android" ? ".apk" : ".ipa",
        mimeType: "application/octet-stream",
        fileSize: version.sizeBytes,
        checksum: version.sha256,
        storageProvider: "local",
        storagePath: (version as MobileAppVersionEntity & { storagePath?: string }).storagePath ?? "",
        visibility: "private",
        status: "active",
        uploaderId: "u_1",
        uploaderName: "tester",
        createdAt: version.createdAt,
        updatedAt: version.updatedAt
      };
    }
  };

  return { sharedConfigQuery, uploadQuery, mobileAppVersionQuery, mobileAppVersionCommand } as unknown as AppContainer;
}

function createVersion(input: Partial<MobileAppVersionEntity> & { storagePath?: string }): MobileAppVersionEntity {
  return {
    id: input.id ?? `mav_${input.platform ?? "android"}`,
    projectId: "proj_1",
    platform: input.platform ?? "android",
    version: input.version ?? "1.2.0",
    buildNumber: input.buildNumber ?? "2026061201",
    status: input.status ?? "published",
    packageUploadId: input.packageUploadId ?? `upl_${input.platform ?? "android"}`,
    packageName: input.packageName ?? (input.platform === "ios" ? "HubV2-v1.2.0.ipa" : "HubV2-v1.2.0.apk"),
    sizeBytes: input.sizeBytes ?? 109320667,
    sha256: input.sha256 ?? "sha256-android",
    changelog: input.changelog ?? ["统一待办入口", "修复推送问题"],
    releaseChannel: input.releaseChannel ?? "企业内测",
    minOsVersion: input.minOsVersion ?? "Android 10",
    publishedAt: input.publishedAt ?? "2026-06-12T00:00:00.000Z",
    downloadCount: input.downloadCount ?? 0,
    createdBy: null,
    updatedBy: null,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z"
  };
}

function createPortalSettings(value: Record<string, unknown>): SharedConfigEntity {
  return {
    id: "cfg_mobile_portal",
    projectId: "proj_1",
    scope: "project",
    configKey: "mobile-app.portal-settings",
    configName: "移动端 APP 门户配置",
    category: "mobile-app-portal",
    valueType: "json",
    configValue: JSON.stringify({
      enabled: true,
      logoUrl: null,
      name: "Hub V2 Mobile",
      subtitle: "研发协作随身端",
      description: "Hub V2 Mobile 下载页",
      primaryColor: "#6366F1",
      accentColor: "#10B981",
      showQrcode: true,
      showInstallGuide: true,
      showVersionHistory: true,
      showSystemRequirements: false,
      showDownloadStats: false,
      bannerEnabled: true,
      bannerText: "移动端 APP 已开放下载",
      bannerStyle: "brand",
      bannerLink: "",
      ...value
    }),
    description: null,
    isEncrypted: false,
    priority: 0,
    status: "active",
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z"
  };
}
