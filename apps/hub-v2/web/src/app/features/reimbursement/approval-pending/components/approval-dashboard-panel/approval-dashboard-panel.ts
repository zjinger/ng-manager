import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatCardComponent } from '@shared/ui';

// ==================== 类型 ====================

export type ApprovalDashboardStats = {
  pendingCount: number; // 待我审批
  todayAddedCount: number; // 今日新增
  approvedCount: number; // 已通过
  rejectedCount: number; // 已驳回
};

// ==================== 默认值 ====================

const DEFAULT_STATS: ApprovalDashboardStats = {
  pendingCount: 0,
  todayAddedCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
};

@Component({
  selector: 'approval-dashboard-panel',
  standalone: true,
  imports: [StatCardComponent],

  template: `
    <div class="grid">
      @for (item of statCards(); track item.key) {
      <app-stat-card
        class="stat-card"
        [label]="item.label"
        [value]="item.value"
        [icon]="item.icon"
      />
      }
    </div>
  `,

  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .grid {
        margin-bottom: 20px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        width: 100%;
      }

      .stat-card {
        width: 100%;
        min-width: 0;
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
export class ApprovalDashboardPanelComponent {
  // ==================== 输入 ====================

  readonly stats = input<ApprovalDashboardStats>(DEFAULT_STATS);

  // ==================== 卡片配置 ====================

  readonly statCards = computed(() => {
    const stats = this.stats();

    return [
      {
        key: 'pending',
        label: '待我审批',
        value: stats.pendingCount,
        icon: 'clock-circle',
      },

      {
        key: 'today',
        label: '今日新增',
        value: stats.todayAddedCount,
        icon: 'file-add',
      },

      {
        key: 'approved',
        label: '已通过',
        value: stats.approvedCount,
        icon: 'check-circle',
      },

      {
        key: 'rejected',
        label: '已驳回',
        value: stats.rejectedCount,
        icon: 'close-circle',
      },
    ];
  });
}
