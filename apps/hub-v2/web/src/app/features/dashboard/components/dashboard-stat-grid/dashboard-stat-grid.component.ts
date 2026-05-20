import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatCardComponent } from '@shared/ui';

export interface DashboardStatCardItem {
  key: string;
  label: string;
  value: string | number;
  hint: string;
  icon: string;
  tone: 'blue' | 'purple' | 'green' | 'orange' | 'cyan';
}

@Component({
  selector: 'app-dashboard-stat-grid',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <div class="grid">
      @for (item of items(); track item.key) {
        <app-stat-card
          [label]="item.label"
          [value]="item.value"
          [hint]="item.hint"
          [icon]="item.icon"
          [tone]="item.tone"
        />
      }
    </div>
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      @media (max-width: 1200px) {
        .grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 960px) {
        .grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 720px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStatGridComponent {
  readonly items = input.required<DashboardStatCardItem[]>();
}
