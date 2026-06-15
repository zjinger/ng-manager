import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { formatUploadSizeLimit, UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import type {
  MobileAppPlatform,
  ProjectMobileAppConfig,
  ProjectMobileAppPlatformConfig,
  ProjectMobileAppReleaseNote,
  ProjectSummary,
  UpdateProjectMobileAppConfigInput,
} from '../../../models/project.model';

type MobileAppDraft = Required<Pick<UpdateProjectMobileAppConfigInput, 'enabled'>> &
  Pick<
    UpdateProjectMobileAppConfigInput,
    'app' | 'current' | 'platforms' | 'releaseNotes' | 'installSteps' | 'faq' | 'support' | 'cache' | 'releaseChannel'
  >;

@Component({
  selector: 'app-project-config-mobile-app-tab',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSwitchModule,
    NzTooltipModule,
  ],
  templateUrl: './project-config-mobile-app-tab.component.html',
  styleUrls: ['./project-config-mobile-app-tab.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectConfigMobileAppTabComponent {
  readonly project = input<ProjectSummary | null>(null);
  readonly config = input<ProjectMobileAppConfig | null>(null);
  readonly busy = input(false);
  readonly canManageConfig = input(false);
  readonly pendingPlatforms = input<MobileAppPlatform[]>([]);

  readonly saveMobileAppConfig = output<UpdateProjectMobileAppConfigInput>();
  readonly uploadMobileAppPackage = output<{ platform: MobileAppPlatform; file: File }>();
  readonly removeMobileAppPackage = output<MobileAppPlatform>();
  readonly copyDownloadPageUrl = output<string>();

  readonly packagePolicy = UPLOAD_TARGETS.mobileAppPackage;
  readonly draft = signal<MobileAppDraft | null>(null);
  readonly fileError = signal('');

  constructor() {
    effect(() => {
      const config = this.config();
      this.draft.set(config ? cloneConfig(config) : null);
      this.fileError.set('');
    });
  }

  packageSizeLimit(): string {
    return formatUploadSizeLimit(this.packagePolicy);
  }

  isPlatformPending(platform: MobileAppPlatform): boolean {
    return this.pendingPlatforms().includes(platform);
  }

  platformLabel(platform: MobileAppPlatform): string {
    return platform === 'android' ? 'Android APK' : 'iOS 企业包';
  }

  downloadPageUrl(): string {
    const projectKey = this.project()?.projectKey?.trim();
    if (!projectKey) {
      return '';
    }
    return `${window.location.origin}/download/${encodeURIComponent(projectKey)}`;
  }

  packageSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) {
      return '-';
    }
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  }

  updateEnabled(enabled: boolean): void {
    this.patchDraft({ enabled });
  }

  updateAppField(field: 'name' | 'title' | 'subtitle' | 'description' | 'channel', value: string): void {
    const draft = this.ensureDraft();
    this.patchDraft({
      app: {
        ...(draft.app ?? {}),
        [field]: value,
      },
    });
  }

  updateSupportField(field: 'owner' | 'contact' | 'docsUrl', value: string): void {
    const draft = this.ensureDraft();
    this.patchDraft({
      support: {
        ...(draft.support ?? {}),
        [field]: value.trim() || null,
      },
    });
  }

  updatePlatformField<K extends keyof ProjectMobileAppPlatformConfig>(
    platform: MobileAppPlatform,
    field: K,
    value: ProjectMobileAppPlatformConfig[K],
  ): void {
    const draft = this.ensureDraft();
    const platforms = (draft.platforms ?? []).map((item) =>
      item.platform === platform ? { ...item, [field]: value } : item,
    );
    this.patchDraft({ platforms });
  }

  updatePlatformNumberField(platform: MobileAppPlatform, field: 'versionCode', value: unknown): void {
    const numeric = Number(value);
    this.updatePlatformField(platform, field, Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null);
  }

  addReleaseNote(): void {
    const draft = this.ensureDraft();
    const next = createEmptyReleaseNote(draft.releaseNotes?.length ?? 0);
    this.patchDraft({ releaseNotes: [next, ...(draft.releaseNotes ?? [])] });
  }

  addReleaseNoteFromCurrent(): void {
    const draft = this.ensureDraft();
    const primary = this.findPrimaryPlatform(draft.platforms ?? []);
    const version = draft.current?.versionName || primary?.versionName || '';
    const title = version ? `${version} 发布` : '新版本发布';
    const next: ProjectMobileAppReleaseNote = {
      ...createEmptyReleaseNote(draft.releaseNotes?.length ?? 0),
      version,
      title,
      publishedAt: draft.current?.publishedAt || new Date().toISOString().slice(0, 10),
      summary: ['请填写本次移动端更新内容。'],
      downloadUrl: primary?.downloadUrl ?? null,
    };
    this.patchDraft({ releaseNotes: [next, ...(draft.releaseNotes ?? [])] });
  }

  removeReleaseNote(id: string): void {
    const draft = this.ensureDraft();
    this.patchDraft({ releaseNotes: (draft.releaseNotes ?? []).filter((item) => item.id !== id) });
  }

  updateReleaseNoteField<K extends keyof ProjectMobileAppReleaseNote>(
    id: string,
    field: K,
    value: ProjectMobileAppReleaseNote[K],
  ): void {
    const draft = this.ensureDraft();
    this.patchDraft({
      releaseNotes: (draft.releaseNotes ?? []).map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    });
  }

  updateReleaseNoteLines(id: string, field: 'summary' | 'importantNotes', value: string): void {
    this.updateReleaseNoteField(id, field, value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  }

  releaseNoteLines(item: ProjectMobileAppReleaseNote, field: 'summary' | 'importantNotes'): string {
    return item[field].join('\n');
  }

  onPackageSelected(platform: MobileAppPlatform, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }
    const validationError = validateUploadFile(file, this.packagePolicy);
    if (validationError) {
      this.fileError.set(validationError);
      return;
    }
    this.fileError.set('');
    this.uploadMobileAppPackage.emit({ platform, file });
  }

  submit(): void {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    this.saveMobileAppConfig.emit({
      ...draft,
      platforms: draft.platforms ?? [],
      releaseNotes: (draft.releaseNotes ?? []).filter((item) => item.version.trim() && item.title.trim()),
    });
  }

  copyPageUrl(): void {
    const url = this.downloadPageUrl();
    if (url) {
      this.copyDownloadPageUrl.emit(url);
    }
  }

  private patchDraft(patch: Partial<MobileAppDraft>): void {
    const draft = this.ensureDraft();
    this.draft.set({ ...draft, ...patch });
  }

  private ensureDraft(): MobileAppDraft {
    const draft = this.draft();
    if (draft) {
      return draft;
    }
    const fallback = cloneConfig(this.config());
    this.draft.set(fallback);
    return fallback;
  }

  private findPrimaryPlatform(platforms: ProjectMobileAppPlatformConfig[]): ProjectMobileAppPlatformConfig | null {
    return platforms.find((item) => item.enabled && item.packageUploadId) ?? platforms.find((item) => item.enabled) ?? null;
  }
}

function cloneConfig(config: ProjectMobileAppConfig | null): MobileAppDraft {
  return {
    enabled: config?.enabled ?? false,
    app: {
      name: config?.app.name ?? '',
      title: config?.app.title ?? '',
      subtitle: config?.app.subtitle ?? '',
      description: config?.app.description ?? '',
      channel: config?.app.channel ?? 'mobile-app',
    },
    current: config?.current ? { ...config.current } : undefined,
    platforms: clonePlatforms(config?.platforms ?? []),
    installSteps: (config?.installSteps ?? []).map((item) => ({ ...item })),
    faq: (config?.faq ?? []).map((item) => ({ ...item })),
    support: {
      owner: config?.support.owner ?? '',
      contact: config?.support.contact ?? null,
      docsUrl: config?.support.docsUrl ?? null,
    },
    releaseNotes: (config?.releaseNotes ?? []).map((item) => ({
      id: item.id,
      version: item.version,
      title: item.title,
      publishedAt: item.publishedAt,
      summary: [...item.summary],
      importantNotes: [...item.importantNotes],
      downloadUrl: item.downloadUrl,
    })),
    cache: { maxAgeSeconds: config?.cache.maxAgeSeconds ?? 120 },
    releaseChannel: config?.source.releaseChannel ?? config?.app.channel ?? 'mobile-app',
  };
}

function createEmptyReleaseNote(index: number): ProjectMobileAppReleaseNote {
  return {
    id: `mobile-app-release-${Date.now()}-${index}`,
    version: '',
    title: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    summary: [],
    importantNotes: [],
    downloadUrl: null,
  };
}

function clonePlatforms(platforms: ProjectMobileAppPlatformConfig[]): ProjectMobileAppPlatformConfig[] {
  const byPlatform = new Map(platforms.map((item) => [item.platform, item]));
  return (['android', 'ios'] as const).map((platform) => {
    const item = byPlatform.get(platform);
    return {
      platform,
      enabled: item?.enabled ?? false,
      packageUploadId: item?.packageUploadId ?? null,
      packageName: item?.packageName ?? null,
      versionName: item?.versionName ?? null,
      versionCode: item?.versionCode ?? null,
      downloadUrl: item?.downloadUrl ?? null,
      qrCodeUrl: item?.qrCodeUrl ?? null,
      packageSizeBytes: item?.packageSizeBytes ?? null,
      minOsVersion: item?.minOsVersion ?? null,
      checksum: {
        sha256: item?.checksum.sha256 ?? null,
        md5: item?.checksum.md5 ?? null,
      },
      distributionType: item?.distributionType ?? '内测',
      forceUpdate: item?.forceUpdate ?? false,
      gray: item?.gray ?? false,
      minSupportedVersion: item?.minSupportedVersion ?? null,
    };
  });
}
