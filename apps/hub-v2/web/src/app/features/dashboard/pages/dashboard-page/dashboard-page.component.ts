import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { DashboardStatGridComponent } from '../../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { LatestAnnouncementsCardComponent } from '../../components/latest-announcements-card/latest-announcements-card.component';
import { MyActivitiesCardComponent } from '../../components/my-activities-card/my-activities-card.component';
import { MyTodosCardComponent } from '../../components/my-todos-card/my-todos-card.component';
import { DashboardStore } from '../../store/dashboard.store';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    DashboardStatGridComponent,
    MyTodosCardComponent,
    MyActivitiesCardComponent,
    LatestAnnouncementsCardComponent,
  ],
  providers: [DashboardStore],
  template: `
    <app-page-header
      title="Dashboard"
      subtitle="聚合当前项目上下文下的待办、研发项与最新公告。"
    />

    @if (store.loading()) {
      <div class="empty">
        <div class="empty__title">正在加载首页数据…</div>
        <div class="empty__hint">正在同步当前项目下的待办、动态和公告。</div>
      </div>
    } @else if (store.data(); as data) {
      <app-dashboard-stat-grid [stats]="data.stats" />

      <div class="dashboard-grid">
        <app-my-todos-card [items]="data.todos" />
        <app-my-activities-card [items]="data.activities" />
        <app-latest-announcements-card [items]="data.announcements" />
      </div>
    } @else {
      <div class="empty">
        <div class="empty__title">首页数据加载失败或当前项目暂无内容</div>
        <div class="empty__hint">可以先创建用户、项目或录入协作数据后再返回首页查看。</div>
      </div>
    }
  `,
  styles: [
    `
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
      }
      .empty {
        padding: 32px;
        border-radius: 16px;
        border: 1px dashed var(--border-color);
        background: var(--bg-container);
        box-shadow: var(--shadow-sm);
      }
      .empty__title {
        color: var(--text-primary);
        font-weight: 600;
      }
      .empty__hint {
        margin-top: 8px;
        color: var(--text-muted);
      }
      :host-context(html[data-theme='dark']) .empty {
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 45%),
          var(--bg-container);
        border-color: rgba(148, 163, 184, 0.14);
      }
      @media (max-width: 1320px) {
        .dashboard-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 1100px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly store = inject(DashboardStore);

  constructor() {
    this.store.load();
  }
}
