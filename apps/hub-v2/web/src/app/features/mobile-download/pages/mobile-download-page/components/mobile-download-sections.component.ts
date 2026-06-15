import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type {
  MobileAppDownloadInfo,
  MobileAppDownloadPlatform,
  MobileAppDownloadReleaseNote,
} from '../../../models/mobile-download.model';

@Component({
  selector: 'app-mobile-download-sections',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './mobile-download-sections.component.html',
  styleUrl: './mobile-download-sections.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDownloadSectionsComponent {
  readonly info = input.required<MobileAppDownloadInfo>();
  readonly selectedPlatform = input<MobileAppDownloadPlatform | null>(null);

  readonly copyChecksum = output<MobileAppDownloadPlatform | null>();

  platformSystem(platform: MobileAppDownloadPlatform | null): string {
    if (!platform) {
      return '-';
    }
    return platform.minOsVersion || (platform.platform === 'android' ? 'Android 10+' : 'iOS 14+');
  }

  checksumText(platform: MobileAppDownloadPlatform | null): string {
    const sha256 = platform?.checksum.sha256?.trim();
    if (sha256) {
      return `SHA256 ${sha256}`;
    }
    const md5 = platform?.checksum.md5?.trim();
    return md5 ? `MD5 ${md5}` : '暂无校验值';
  }

  trackRelease(_index: number, item: MobileAppDownloadReleaseNote): string {
    return item.id;
  }

  trackTextItem(index: number, item: { title?: string; question?: string }): string {
    return item.title || item.question || String(index);
  }
}
