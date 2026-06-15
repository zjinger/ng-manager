import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type {
  MobileAppDownloadInfo,
  MobileAppDownloadPlatform,
  MobileAppPlatform,
} from '../../../models/mobile-download.model';

@Component({
  selector: 'app-mobile-download-panel',
  standalone: true,
  templateUrl: './mobile-download-panel.component.html',
  styleUrl: './mobile-download-panel.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDownloadPanelComponent {
  readonly info = input.required<MobileAppDownloadInfo>();
  readonly selectedPlatform = input<MobileAppDownloadPlatform | null>(null);
  readonly selectedPlatformKey = input<MobileAppPlatform>('android');

  readonly platformSelected = output<MobileAppPlatform>();

  deviceName(): string {
    const platform = this.selectedPlatform()?.platform ?? this.selectedPlatformKey();
    if (platform === 'ios') {
      return 'iOS 企业版';
    }
    return 'Android APK';
  }

  deviceHint(): string {
    const platform = this.selectedPlatform()?.platform ?? this.selectedPlatformKey();
    return platform === 'ios'
      ? '安装前请确认企业证书信任状态。'
      : '安装前请确认系统版本和安装权限。';
  }

  platformLabel(platform: MobileAppDownloadPlatform | null): string {
    if (!platform) {
      return '-';
    }
    return platform.platform === 'android' ? 'Android APK' : 'iOS 企业包';
  }

  platformShortLabel(platform: MobileAppDownloadPlatform | null): string {
    if (!platform) {
      return '-';
    }
    return platform.platform === 'android' ? 'Android' : 'iOS';
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

  downloadText(platform: MobileAppDownloadPlatform | null): string {
    if (!platform?.downloadUrl) {
      return '暂无安装包';
    }
    return platform.platform === 'android' ? '立即下载 APK' : '安装 iOS 企业版';
  }

  channelTag(): string {
    const channel = this.selectedPlatform()?.distributionType || this.info().current.channel || '内测';
    return channel.endsWith('版') ? channel : `${channel}版`;
  }

  trackPlatform(_index: number, item: MobileAppDownloadPlatform): string {
    return item.platform;
  }
}
