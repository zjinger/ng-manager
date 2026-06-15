import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { MobileAppDownloadInfo, MobileAppDownloadPlatform } from '../../../models/mobile-download.model';

@Component({
  selector: 'app-mobile-download-hero',
  standalone: true,
  templateUrl: './mobile-download-hero.component.html',
  styleUrl: './mobile-download-hero.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDownloadHeroComponent {
  readonly info = input.required<MobileAppDownloadInfo>();
  readonly selectedPlatform = input<MobileAppDownloadPlatform | null>(null);

  displayTitle(): string {
    const app = this.info().app;
    return app.name || app.title || 'Hub V2 Mobile';
  }

  displayDescription(): string {
    const app = this.info().app;
    return app.description || app.subtitle || '研发协作随身端';
  }

  versionText(): string {
    return this.info().current.versionName || this.selectedPlatform()?.versionName || '最新版';
  }

  channelText(): string {
    return this.info().current.channel || this.info().app.channel || '企业内部';
  }

  compatibility(): string {
    const platforms = this.info().platforms.filter((item) => item.enabled);
    if (platforms.length === 0) {
      return '-';
    }
    return platforms.map((item) => (item.platform === 'android' ? 'Android' : 'iOS')).join(' / ');
  }
}
