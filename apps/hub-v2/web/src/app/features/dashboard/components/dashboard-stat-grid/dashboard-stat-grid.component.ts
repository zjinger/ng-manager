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
        hint="当前分配给你的问题单"
        icon="bug"
        tone="blue"
      />
      <app-stat-card
        label="待验证测试单"
        [value]="stats().verifyingIssues"
        hint="需要你完成验证闭环"
        icon="safety-certificate"
        tone="purple"
      />
      <app-stat-card
        label="进行中研发项"
        [value]="stats().inProgressRdItems"
        hint="正在推进中的研发任务"
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      @media (max-width: 1200px) {
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
