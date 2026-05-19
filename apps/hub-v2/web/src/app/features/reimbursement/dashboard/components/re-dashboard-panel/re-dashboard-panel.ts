import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatCardComponent } from '@shared/ui';

export interface ReDashboardStats {
  todoCount: number;
  myApprovingCount: number;
  rejectedCount: number;
  completedThisMonthCount: number;
  monthAmount: number;
}

@Component({
  selector: 're-dashboard-panel',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  template: `
    <div class="grid">
      <app-stat-card
        label="待我审批"
        [value]="stats().todoCount"
        hint="含主管、审核、会计节点"
        icon="bug"
        tone="blue"
      />
      <app-stat-card
        label="审批中"
        [value]="stats().myApprovingCount"
        hint="我提交后仍在流转中"
        icon="safety-certificate"
        tone="purple"
      />
      <app-stat-card
        label="已驳回"
        [value]="stats().rejectedCount"
        hint="需补充票据或说明"
        icon="alert"
        tone="cyan"
      />
      <app-stat-card
        label="本月已完成"
        [value]="stats().completedThisMonthCount"
        hint="本月完成审批的单据数"
        icon="rocket"
        tone="green"
      />
      <app-stat-card
        label="本月报销金额"
        [value]="'¥' + (stats().monthAmount | number:'1.2-2')"
        hint="本月单据金额汇总"
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
export class ReDashboardPanelComponent {
  readonly stats = input<ReDashboardStats>({
    todoCount: 0,
    myApprovingCount: 0,
    rejectedCount: 0,
    completedThisMonthCount: 0,
    monthAmount: 0,
  });
}
