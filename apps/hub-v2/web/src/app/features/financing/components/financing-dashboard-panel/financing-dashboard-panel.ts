import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatCardComponent } from '@shared/ui';
// import type { DashboardStats } from '../../models/dashboard.model';

@Component({
  selector: 'financing-dashboard-panel',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <div class="grid">
      <app-stat-card
        label="待我审批"
        [value]="3"
        hint="含主管、审核、会计节点"
        icon="bug"
        tone="blue"
      />
      <app-stat-card
        label="审批中"
        [value]="6"
        hint="我提交后仍在流转中"
        icon="safety-certificate"
        tone="purple"
      />
      <app-stat-card
        label="已驳回"
        [value]="1"
        hint="需补充票据或说明"
        icon="alert"
        tone="cyan"
      />
      <app-stat-card
        label="本月已完成"
        [value]="12"
        hint="已完成付款归档"
        icon="rocket"
        tone="green"
      />
      <app-stat-card
        label="本月报销金额"
        [value]="42.8"
        hint="较上月 +8.6%"
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
export class FinancingDashboardPanelComponent {
//   readonly stats = input.required<DashboardStats>();
}
