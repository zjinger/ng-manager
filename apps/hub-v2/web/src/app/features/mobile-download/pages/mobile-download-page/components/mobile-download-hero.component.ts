import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { MobileAppDownloadInfo, MobileAppDownloadPlatform } from '../../../models/mobile-download.model';

@Component({
  selector: 'app-mobile-download-hero',
  standalone: true,
  imports: [DatePipe],
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

  compatibility(): string {
    const platforms = this.info().platforms.filter((item) => item.enabled);
    if (platforms.length === 0) {
      return '-';
    }
    return platforms.map((item) => (item.platform === 'android' ? 'Android' : 'iOS')).join(' / ');
  }
}
