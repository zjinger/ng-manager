import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { DashboardStatCardData } from '../models/dashboard.model';
import { DashboardStatCardComponent } from './dashboard-stat-card.component';

@Component({
  selector: 'app-dashboard-stat-grid',
  standalone: true,
  imports: [CommonModule, DashboardStatCardComponent],
  template: `
    <div class="stat-grid">
      @for (item of stats; track item.key) {
        <app-dashboard-stat-card [item]="item"></app-dashboard-stat-card>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }

      @media (max-width: 640px) {
        .stat-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class DashboardStatGridComponent {
  @Input() stats: DashboardStatCardData[] = [];
}
