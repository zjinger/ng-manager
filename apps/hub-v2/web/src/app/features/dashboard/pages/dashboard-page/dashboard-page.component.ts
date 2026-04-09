import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';

import { PageHeaderComponent } from '@shared/ui';
import { ProjectContextStore } from '@core/state';
import { DashboardRefreshBusService } from '@core/realtime';
import { DashboardStatGridComponent } from '../../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { LatestAnnouncementsCardComponent } from '../../components/latest-announcements-card/latest-announcements-card.component';
import { LatestDocumentsCardComponent } from '../../components/latest-documents-card/latest-documents-card.component';
import { MyActivitiesCardComponent } from '../../components/my-activities-card/my-activities-card.component';
import { MyTodosCardComponent } from '../../components/my-todos-card/my-todos-card.component';
import { ReportedIssuesCardComponent } from '../../components/reported-issues-card/reported-issues-card.component';
import { DashboardShortcutsComponent, type DashboardShortcutItem } from '../../components/dashboard-shortcuts/dashboard-shortcuts.component';
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
    DashboardShortcutsComponent,
    ReportedIssuesCardComponent,
  ],
  providers: [DashboardStore],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.less'],
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
  readonly shortcutItems: DashboardShortcutItem[] = [
    {
      key: 'issues',
      label: '新建测试单  ',
      description: '跳转测试跟踪并打开新增弹窗',
      route: '/issues',
      queryParams: { action: 'create' },
      state: { quickCreate: 'issue' },
      icon: 'bug',
      tone: 'blue',
    },
    {
      key: 'rd',
      label: '新建研发项',
      description: '跳转研发管理并打开新增弹窗',
      route: '/rd',
      queryParams: { action: 'create' },
      state: { quickCreate: 'rd' },
      icon: 'rocket',
      tone: 'violet',
    },
    {
      key: 'content',
      label: '内容管理',
      description: '公告、文档与版本发布',
      route: '/content',
      icon: 'read',
      tone: 'green',
    },
    {
      key: 'feedbacks',
      label: '反馈管理',
      description: '处理上线反馈问题',
      route: '/feedbacks',
      icon: 'message',
      tone: 'amber',
    },
    {
      key: 'projects',
      label: '项目管理',
      description: '维护项目成员与配置',
      route: '/projects',
      icon: 'appstore',
      tone: 'rose',
    },
    {
      key: 'profile',
      label: '个人中心',
      description: '查看并维护个人信息与偏好',
      route: '/profile',
      icon: 'user',
      tone: 'slate',
    },
  ];

  constructor() {
    this.store.load({ force: true });

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
