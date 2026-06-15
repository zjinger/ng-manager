import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import type {
  MobileAppVersion,
  MobileAppVersionStats,
  MobileAppReleaseRecord,
  CreateMobileAppVersionInput,
  UpdateMobileAppVersionInput,
} from '../models/mobile-app-version.model';

const MOCK_VERSIONS: MobileAppVersion[] = [
  {
    id: 'v1',
    version: 'v1.2.0',
    buildNumber: '2026061201',
    platform: 'ios',
    packageName: 'HubV2-v1.2.0.ipa',
    sizeBytes: 90596966,
    status: 'published',
    publishedAt: '2026-06-12T14:30:00',
    downloadCount: 342,
    sha256: '8f42c9d1a6e0b7f3d29a4e5c81b6f0a7d3e9c2b5a8f1d4e7c0a3b6f9d2e5c8',
    changelog: [
      '统一待办入口，合并 Issue、研发项和待验证任务',
      '消息中心支持公告、评论和指派通知聚合',
      '工作台新增研发项进度条和快捷入口',
      '修复 Android 推送偶发丢失问题',
    ],
    releaseChannel: '企业内测 — 全员',
    minOsVersion: 'iOS 15.0',
    createdAt: '2026-06-12T10:00:00',
    updatedAt: '2026-06-12T14:30:00',
  },
  {
    id: 'v2',
    version: 'v1.2.0',
    buildNumber: '2026061201',
    platform: 'android',
    packageName: 'HubV2-v1.2.0.apk',
    sizeBytes: 77791334,
    status: 'published',
    publishedAt: '2026-06-12T14:35:00',
    downloadCount: 289,
    sha256: '6b10a4f93d2e8c7a5f1b0d4e9c2a7f3b6e8d1c5a0f4b7e2d9c6a3f8b1e5d0c4',
    changelog: [
      '统一待办入口，合并 Issue、研发项和待验证任务',
      '消息中心支持公告、评论和指派通知聚合',
      '工作台新增研发项进度条和快捷入口',
      '适配 Android 14 通知权限变更',
    ],
    releaseChannel: '企业内测 — 全员',
    minOsVersion: 'Android 10',
    createdAt: '2026-06-12T10:00:00',
    updatedAt: '2026-06-12T14:35:00',
  },
  {
    id: 'v3',
    version: 'v1.1.2',
    buildNumber: '2026060501',
    platform: 'ios',
    packageName: 'HubV2-v1.1.2.ipa',
    sizeBytes: 89234432,
    status: 'published',
    publishedAt: '2026-06-05T10:00:00',
    downloadCount: 198,
    sha256: 'a3f8b1e5d0c46b10a4f93d2e8c7a5f1b0d4e9c2a7f3b6e8d1c5a0f4b7e2d9c6',
    changelog: [
      '修复登录页面在 iPad 横屏下的布局异常',
      '消息详情支持 Markdown 渲染',
      '优化首页加载速度',
    ],
    releaseChannel: '企业内测 — 全员',
    minOsVersion: 'iOS 15.0',
    createdAt: '2026-06-05T08:00:00',
    updatedAt: '2026-06-05T10:00:00',
  },
  {
    id: 'v4',
    version: 'v1.2.0-rc.1',
    buildNumber: '2026061003',
    platform: 'ios',
    packageName: 'HubV2-v1.2.0-rc.1.ipa',
    sizeBytes: 90177536,
    status: 'testing',
    publishedAt: '2026-06-10T16:20:00',
    downloadCount: 47,
    sha256: 'd4e9c2a7f3b6e8d1c5a0f4b7e2d9c6a3f8b1e5d0c46b10a4f93d2e8c7a5f1b0',
    changelog: [
      'RC 版本 — 候选发布',
      '新增待办筛选器（全部/Issue/研发项/待验证）',
      '修复 WebSocket 断连后消息不同步',
    ],
    releaseChannel: '企业内测 — 研发组',
    minOsVersion: 'iOS 15.0',
    createdAt: '2026-06-10T14:00:00',
    updatedAt: '2026-06-10T16:20:00',
  },
  {
    id: 'v5',
    version: 'v1.2.0-rc.1',
    buildNumber: '2026061003',
    platform: 'android',
    packageName: 'HubV2-v1.2.0-rc.1.apk',
    sizeBytes: 77385728,
    status: 'testing',
    publishedAt: '2026-06-10T16:25:00',
    downloadCount: 32,
    sha256: 'f3b6e8d1c5a0f4b7e2d9c6a3f8b1e5d0c46b10a4f93d2e8c7a5f1b0d4e9c2a7',
    changelog: [
      'RC 版本 — 候选发布',
      '新增待办筛选器',
      '修复 Android 推送通道注册失败',
    ],
    releaseChannel: '企业内测 — 研发组',
    minOsVersion: 'Android 10',
    createdAt: '2026-06-10T14:00:00',
    updatedAt: '2026-06-10T16:25:00',
  },
  {
    id: 'v6',
    version: 'v1.1.1',
    buildNumber: '2026052801',
    platform: 'ios',
    packageName: 'HubV2-v1.1.1.ipa',
    sizeBytes: 88801280,
    status: 'archived',
    publishedAt: '2026-05-28T09:00:00',
    downloadCount: 156,
    sha256: 'b0d4e9c2a7f3b6e8d1c5a0f4b7e2d9c6a3f8b1e5d0c46b10a4f93d2e8c7a5f1',
    changelog: [
      '工作台首屏优化',
      '新增研发项进度展示',
      '公告列表支持已读/未读状态',
    ],
    releaseChannel: '企业内测 — 全员',
    minOsVersion: 'iOS 15.0',
    createdAt: '2026-05-28T07:00:00',
    updatedAt: '2026-05-28T09:00:00',
  },
  {
    id: 'v7',
    version: 'v1.1.0',
    buildNumber: '2026051501',
    platform: 'ios',
    packageName: 'HubV2-v1.1.0.ipa',
    sizeBytes: 86274048,
    status: 'draft',
    publishedAt: null,
    downloadCount: 0,
    sha256: '—',
    changelog: [
      '计划新增项目切换功能',
      '计划新增设置 Bottom Sheet',
    ],
    releaseChannel: '企业内测 — 研发组',
    minOsVersion: 'iOS 15.0',
    createdAt: '2026-05-15T10:00:00',
    updatedAt: '2026-05-15T10:00:00',
  },
  {
    id: 'v8',
    version: 'v1.0.0-beta.1',
    buildNumber: '2026050101',
    platform: 'ios',
    packageName: 'HubV2-v1.0.0-beta.1.ipa',
    sizeBytes: 82417664,
    status: 'archived',
    publishedAt: '2026-05-01T08:00:00',
    downloadCount: 225,
    sha256: 'c5a0f4b7e2d9c6a3f8b1e5d0c46b10a4f93d2e8c7a5f1b0d4e9c2a7f3b6e8d1',
    changelog: [
      '首个内测版本',
      '登录、工作台、待办、消息、我的 5 个核心页面',
      '服务器地址配置',
    ],
    releaseChannel: '企业内测 — 研发组',
    minOsVersion: 'iOS 15.0',
    createdAt: '2026-05-01T06:00:00',
    updatedAt: '2026-05-01T08:00:00',
  },
];

@Injectable({ providedIn: 'root' })
export class MobileAppVersionApiService {
  private versions = [...MOCK_VERSIONS];

  listVersions(): Observable<MobileAppVersion[]> {
    return of(this.versions).pipe(delay(300));
  }

  getVersion(id: string): Observable<MobileAppVersion | null> {
    const version = this.versions.find((v) => v.id === id) ?? null;
    return of(version).pipe(delay(200));
  }

  createVersion(input: CreateMobileAppVersionInput): Observable<MobileAppVersion> {
    const newVersion: MobileAppVersion = {
      id: `v${Date.now()}`,
      version: input.version,
      buildNumber: input.buildNumber,
      platform: input.platform,
      packageName: `HubV2-${input.version}.${input.platform === 'ios' ? 'ipa' : 'apk'}`,
      sizeBytes: 0,
      status: input.status,
      publishedAt: input.status === 'published' ? new Date().toISOString() : null,
      downloadCount: 0,
      sha256: '—',
      changelog: input.changelog,
      releaseChannel: input.releaseChannel,
      minOsVersion: input.minOsVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.versions.unshift(newVersion);
    return of(newVersion).pipe(delay(300));
  }

  updateVersion(id: string, input: UpdateMobileAppVersionInput): Observable<MobileAppVersion | null> {
    const index = this.versions.findIndex((v) => v.id === id);
    if (index === -1) {
      return of(null).pipe(delay(200));
    }
    const updated: MobileAppVersion = {
      ...this.versions[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    if (input.status === 'published' && !updated.publishedAt) {
      updated.publishedAt = new Date().toISOString();
    }
    this.versions[index] = updated;
    return of(updated).pipe(delay(300));
  }

  deleteVersion(id: string): Observable<boolean> {
    const index = this.versions.findIndex((v) => v.id === id);
    if (index === -1) {
      return of(false).pipe(delay(200));
    }
    this.versions.splice(index, 1);
    return of(true).pipe(delay(200));
  }

  getStats(): Observable<MobileAppVersionStats> {
    const published = this.versions.filter((v) => v.status === 'published');
    const testing = this.versions.filter((v) => v.status === 'testing');
    const totalDownloads = this.versions.reduce((sum, v) => sum + v.downloadCount, 0);
    const currentVersion = published.length > 0 ? published[0].version : null;

    return of({
      totalVersions: this.versions.length,
      publishedCount: published.length,
      testingCount: testing.length,
      totalDownloads,
      currentVersion,
    }).pipe(delay(200));
  }

  getReleaseRecords(): Observable<MobileAppReleaseRecord[]> {
    const records: MobileAppReleaseRecord[] = this.versions
      .filter((v) => v.publishedAt)
      .map((v) => ({
        id: v.id,
        version: v.version,
        platform: v.platform,
        status: v.status,
        publishedAt: v.publishedAt!,
        changelog: v.changelog,
        downloadCount: v.downloadCount,
        releaseChannel: v.releaseChannel,
      }))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return of(records).pipe(delay(300));
  }
}
