import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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

  recentReleaseNotes(): MobileAppDownloadReleaseNote[] {
    return this.info().releaseNotes.slice(0, 3);
  }

  trackRelease(_index: number, item: MobileAppDownloadReleaseNote): string {
    return item.id;
  }

  trackTextItem(index: number, item: { title?: string; question?: string }): string {
    return item.title || item.question || String(index);
  }
}
