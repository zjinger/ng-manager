import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { UiStore } from '@core/state/ui.store';

import type {
  MobileAppDownloadInfo,
  MobileAppDownloadPlatform,
  MobileAppPlatform,
} from '../../models/mobile-download.model';
import { MobileDownloadApiService } from '../../services/mobile-download-api.service';
import { MobileDownloadHeroComponent } from './components/mobile-download-hero.component';
import { MobileDownloadPanelComponent } from './components/mobile-download-panel.component';
import { MobileDownloadSectionsComponent } from './components/mobile-download-sections.component';

@Component({
  selector: 'app-mobile-download-page',
  standalone: true,
  imports: [MobileDownloadHeroComponent, MobileDownloadPanelComponent, MobileDownloadSectionsComponent],
  templateUrl: './mobile-download-page.component.html',
  styleUrl: './mobile-download-page.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDownloadPageComponent {
  private readonly api = inject(MobileDownloadApiService);
  private readonly title = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly uiStore = inject(UiStore);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly info = signal<MobileAppDownloadInfo | null>(null);
  readonly selectedPlatformKey = signal<MobileAppPlatform>('android');
  readonly toast = signal('');

  readonly selectedPlatform = computed(() => {
    const data = this.info();
    if (!data) {
      return null;
    }
    return (
      data.platforms.find((item) => item.platform === this.selectedPlatformKey()) ??
      data.platforms.find((item) => item.enabled) ??
      data.platforms[0] ??
      null
    );
  });

  readonly stickyDownloadText = computed(() => {
    const platform = this.selectedPlatform();
    if (!platform?.downloadUrl) {
      return '暂无安装包';
    }
    return platform.platform === 'android' ? '立即下载 APK' : '安装 iOS 企业版';
  });

  constructor() {
    this.load();
  }

  load(): void {
    const projectKey = this.route.snapshot.paramMap.get('projectKey')?.trim();
    if (!projectKey) {
      this.info.set(null);
      this.loading.set(false);
      this.error.set('下载链接缺少项目标识，请确认访问地址。');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.getDownloadInfo(projectKey).subscribe({
      next: (data) => {
        this.info.set(data);
        this.title.setTitle(data.app.title || 'Hub V2 Mobile 下载门户');
        this.selectedPlatformKey.set(this.pickInitialPlatform(data));
        this.loading.set(false);
      },
      error: (err: { status?: number; error?: { code?: string; message?: string } }) => {
        this.info.set(null);
        this.loading.set(false);
        if (err?.error?.code === 'MOBILE_APP_DOWNLOAD_CONFIG_INVALID') {
          this.error.set('下载门户配置格式有误，请联系 Hub V2 项目组。');
          return;
        }
        if (err?.error?.code === 'MOBILE_APP_DOWNLOAD_NOT_CONFIGURED' || err?.status === 404) {
          this.error.set('该项目暂未配置移动端 APP 下载页，请联系项目负责人。');
          return;
        }
        this.error.set(err?.error?.message || '下载信息加载失败，请稍后重试。');
      },
    });
  }

  selectPlatform(platform: MobileAppPlatform): void {
    this.selectedPlatformKey.set(platform);
    this.showToast(`已切换到 ${platform === 'android' ? 'Android' : 'iOS'}`);
  }

  platformLabel(platform: MobileAppDownloadPlatform | null): string {
    if (!platform) {
      return '-';
    }
    return platform.platform === 'android' ? 'Android APK' : 'iOS 企业包';
  }

  platformSystem(platform: MobileAppDownloadPlatform | null): string {
    if (!platform) {
      return '-';
    }
    return platform.minOsVersion || (platform.platform === 'android' ? 'Android 10+' : 'iOS 14+');
  }

  packageSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) {
      return '-';
    }
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  }

  checksumText(platform: MobileAppDownloadPlatform | null): string {
    const sha256 = platform?.checksum.sha256?.trim();
    if (sha256) {
      return `SHA256 ${sha256}`;
    }
    const md5 = platform?.checksum.md5?.trim();
    return md5 ? `MD5 ${md5}` : '暂无校验值';
  }

  copyChecksum(platform: MobileAppDownloadPlatform | null): void {
    const value = this.checksumText(platform);
    if (value === '暂无校验值') {
      this.showToast('暂无可复制的校验值');
      return;
    }
    this.copyText(value)
      .then(() => this.showToast('校验值已复制'))
      .catch(() => this.showToast('复制失败，请手动选择校验值'));
  }

  copyDownloadUrl(platform: MobileAppDownloadPlatform | null): void {
    const value = platform?.downloadUrl?.trim();
    if (!value) {
      this.showToast('暂无下载链接');
      return;
    }
    this.copyText(value)
      .then(() => this.showToast('下载链接已复制'))
      .catch(() => this.showToast('复制失败，请手动复制链接'));
  }

  toggleTheme(): void {
    this.uiStore.toggleTheme();
  }

  private pickInitialPlatform(data: MobileAppDownloadInfo): MobileAppPlatform {
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase();
    const preferred: MobileAppPlatform = /iphone|ipad|ipod/.test(ua) ? 'ios' : 'android';
    const preferredItem = data.platforms.find((item) => item.platform === preferred && item.enabled);
    return preferredItem?.platform ?? data.platforms.find((item) => item.enabled)?.platform ?? 'android';
  }

  private async copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) {
        this.toast.set('');
      }
    }, 1800);
  }
}
