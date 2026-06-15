import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatCardComponent } from '@shared/ui';
import type { MobileAppVersionStats } from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-version-stats',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <div class="stats-row">
      <app-stat-card
        label="总版本数"
        [value]="stats()?.totalVersions ?? 0"
        icon="appstore"
        tone="blue"
      />
      <app-stat-card
        label="已发布"
        [value]="stats()?.publishedCount ?? 0"
        [hint]="stats()?.currentVersion ? '当前: ' + stats()?.currentVersion : ''"
        icon="check-circle"
        tone="green"
      />
      <app-stat-card
        label="测试中"
        [value]="stats()?.testingCount ?? 0"
        hint="iOS + Android"
        icon="bug"
        tone="orange"
      />
      <app-stat-card
        label="总下载量"
        [value]="formatNumber(stats()?.totalDownloads ?? 0)"
        icon="download"
        tone="purple"
      />
    </div>
  `,
  styles: [
    `
      .stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }

      @media (max-width: 900px) {
        .stats-row {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 600px) {
        .stats-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionStatsComponent {
  readonly stats = input<MobileAppVersionStats | null>(null);

  formatNumber(value: number): string {
    return value.toLocaleString();
  }
}
