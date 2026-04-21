import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatCardComponent } from '@shared/ui';
import type { DashboardStats } from '../../models/dashboard.model';

@Component({
  selector: 'app-dashboard-stat-grid',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <div class="grid">
      <app-stat-card
        label="待处理测试单"
        [value]="stats().assignedIssues"
        hint="包含负责人和协作人的待处理测试单"
        icon="bug"
        tone="blue"
      />
      <app-stat-card
        label="待验证项"
        [value]="stats().verifyingIssues"
        hint="包含待验证测试单和待验证研发项"
        icon="safety-certificate"
        tone="purple"
      />
      <app-stat-card
        label="我提报未解决"
        [value]="stats().reportedUnresolvedIssues"
        hint="我提报且尚未标记已解决的测试单"
        icon="alert"
        tone="cyan"
      />
      <app-stat-card
        label="未完成研发项"
        [value]="stats().assignedRdItems"
        hint="分配给你且尚未完成的研发项"
        icon="rocket"
        tone="green"
      />
      <app-stat-card
        label="我参与的项目数"
        [value]="stats().myProjects"
        hint="当前可访问的项目总数"
        icon="team"
        tone="orange"
      />
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
  readonly stats = input.required<DashboardStats>();
}
