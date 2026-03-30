import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';

import { PageHeaderComponent } from '@shared/ui';
import { ProjectContextStore } from '@core/state';
import { DashboardRefreshBusService } from '@core/realtime';
import { DashboardStatGridComponent } from '../../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { LatestAnnouncementsCardComponent } from '../../components/latest-announcements-card/latest-announcements-card.component';
import { LatestDocumentsCardComponent } from '../../components/latest-documents-card/latest-documents-card.component';
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
    LatestDocumentsCardComponent,
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
        <app-my-todos-card [items]="data.todos" [projectNames]="projectNames()" />
        <app-my-activities-card [items]="data.activities" [projectNames]="projectNames()" />
        <div class="dashboard-side">
          <app-latest-announcements-card
            [items]="data.announcements"
            [currentProjectId]="projectContext.currentProjectId()"
            [currentProjectName]="projectContext.currentProject()?.name || null"
            [projectNames]="projectNames()"
          />
          <app-latest-documents-card
            [items]="data.documents"
            [currentProjectId]="projectContext.currentProjectId()"
            [currentProjectName]="projectContext.currentProject()?.name || null"
            [projectNames]="projectNames()"
          />
        </div>
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
        --dashboard-panel-height: clamp(440px, 62vh, 620px);
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
        align-items: stretch;
      }
      .dashboard-grid > app-my-todos-card,
      .dashboard-grid > app-my-activities-card {
        height: var(--dashboard-panel-height);
      }
      .dashboard-grid > * {
        min-height: 0;
      }
      .dashboard-side {
        display: grid;
        gap: 20px;
        height: var(--dashboard-panel-height);
        grid-template-rows: repeat(2, minmax(0, 1fr));
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
        .dashboard-grid > app-my-todos-card,
        .dashboard-grid > app-my-activities-card {
          height: auto;
        }
        .dashboard-side {
          gap: 16px;
          height: auto;
          grid-template-rows: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly store = inject(DashboardStore);
  readonly projectContext = inject(ProjectContextStore);
  private readonly dashboardRefreshBus = inject(DashboardRefreshBusService);
  readonly projectNames = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const project of this.projectContext.projects()) {
      map[project.id] = project.name;
    }
    return map;
  });

  constructor() {
    effect(() => {
      this.projectContext.currentProjectId();
      this.store.load({ force: true });
    });

    let skipFirst = true;
    effect(() => {
      const event = this.dashboardRefreshBus.event();
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      untracked(() => {
        this.store.refreshByEntityTypes(event.entityTypes);
      });
    });
  }
}
