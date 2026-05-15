import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatCardComponent } from '@shared/ui';

// ==================== 类型 ====================

/**
 * 我的审批统计
 */
export type StatisticsDashboardStats = {
  handledCount: number; // 我经手的单据
  approvedCount: number; // 我已通过
  rejectedCount: number; // 我驳回过
  processingCount: number; // 仍在流转
};

// ==================== 默认值 ====================

const DEFAULT_STATS: StatisticsDashboardStats = {
  handledCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  processingCount: 0,
};

@Component({
  selector: 'statistics-dashboard-panel',
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
export class StatisticsDashboardPanelComponent {
  // ==================== 输入 ====================

  readonly stats = input<StatisticsDashboardStats>(DEFAULT_STATS);

  // ==================== 卡片配置 ====================

  readonly statCards = computed(() => {
    const stats = this.stats();

    return [
      {
        key: 'handled',
        label: '我经手的单据',
        value: stats.handledCount,
        icon: 'audit',
      },
      {
        key: 'approved',
        label: '我已通过',
        value: stats.approvedCount,
        icon: 'check-circle',
      },

      {
        key: 'rejected',
        label: '我驳回过',
        value: stats.rejectedCount,
        icon: 'close-circle',
      },

      {
        key: 'processing',
        label: '仍在流转',
        value: stats.processingCount,
        icon: 'sync',
      },
    ];
  });
}
