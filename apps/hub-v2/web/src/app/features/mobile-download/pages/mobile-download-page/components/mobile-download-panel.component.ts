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

  readonly platformSelected = output<MobileAppPlatform>();

  orderedPlatforms(): MobileAppDownloadPlatform[] {
    return [...this.info().platforms].sort((a, b) => {
      const order: Record<MobileAppPlatform, number> = { ios: 0, android: 1 };
      return order[a.platform] - order[b.platform];
    });
  }

  packageSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) {
      return '-';
    }
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  }

  packageMeta(platform: MobileAppDownloadPlatform): string {
    const version = platform.versionName || this.info().current.versionName || '最新版';
    const suffix = platform.platform === 'android' ? 'apk' : 'ipa';
    const fileName = platform.packageName || `HubV2-${version}.${suffix}`;
    return `${fileName} · ${this.packageSize(platform.packageSizeBytes)}`;
  }

  trackPlatform(_index: number, item: MobileAppDownloadPlatform): string {
    return item.platform;
  }
}
