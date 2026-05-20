import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatCardComponent } from '@shared/ui';

export type ReDashboardStatKey = 'approvalTodos' | 'myApproving' | 'myRejected' | 'myCompletedThisMonth' | 'myMonthAmount';

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
      @if (isVisible('approvalTodos')) {
        <app-stat-card
          label="待我审批"
          [value]="stats().todoCount"
          hint="分配给我的待处理报销单"
          icon="bug"
          tone="blue"
        />
      }
      @if (isVisible('myApproving')) {
        <app-stat-card
          label="我的审批中"
          [value]="stats().myApprovingCount"
          hint="我提交后仍在流转中"
          icon="safety-certificate"
          tone="purple"
        />
      }
      @if (isVisible('myRejected')) {
        <app-stat-card
          label="我的已驳回"
          [value]="stats().rejectedCount"
          hint="需补充票据或说明"
          icon="alert"
          tone="cyan"
        />
      }
      @if (isVisible('myCompletedThisMonth')) {
        <app-stat-card
          [label]="reportMode() ? '本月已完成' : '我本月完成'"
          [value]="stats().completedThisMonthCount"
          [hint]="reportMode() ? '本月完成审批的单据数' : '我本月完成审批的单据数'"
          icon="rocket"
          tone="green"
        />
      }
      @if (isVisible('myMonthAmount')) {
        <app-stat-card
          [label]="reportMode() ? '本月报销金额' : '我本月报销金额'"
          [value]="'¥' + (stats().monthAmount | number:'1.2-2')"
          [hint]="reportMode() ? '本月单据金额汇总' : '我本月单据金额汇总'"
          icon="team"
          tone="orange"
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
export class ReDashboardPanelComponent {
  readonly stats = input<ReDashboardStats>({
    todoCount: 0,
    myApprovingCount: 0,
    rejectedCount: 0,
    completedThisMonthCount: 0,
    monthAmount: 0,
  });
  readonly visibleKeys = input<ReDashboardStatKey[]>([
    'approvalTodos',
    'myApproving',
    'myRejected',
    'myCompletedThisMonth',
    'myMonthAmount',
  ]);
  readonly reportMode = input(false);

  isVisible(key: ReDashboardStatKey): boolean {
    return this.visibleKeys().includes(key);
  }
}
