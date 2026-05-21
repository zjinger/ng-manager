import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { PageHeaderComponent } from '@shared/ui';
import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { DashboardRefreshBusService } from '@core/realtime';
import type { ReimbursementClaimEntity, ReimbursementClaimStatus, ReimbursementDashboard, ReimbursementStats } from '../../../reimbursement/models/reimbursement.model';
import { ReimbursementApiService } from '../../../reimbursement/services/reimbursement-api.service';
import { DashboardStatGridComponent, type DashboardStatCardItem } from '../../components/dashboard-stat-grid/dashboard-stat-grid.component';
import { LatestAnnouncementsCardComponent } from '../../components/latest-announcements-card/latest-announcements-card.component';
import { LatestDocumentsCardComponent } from '../../components/latest-documents-card/latest-documents-card.component';
import { MyActivitiesCardComponent } from '../../components/my-activities-card/my-activities-card.component';
import { MyTodosCardComponent } from '../../components/my-todos-card/my-todos-card.component';
import { ReportedIssuesCardComponent } from '../../components/reported-issues-card/reported-issues-card.component';
import { DashboardShortcutsComponent, type DashboardShortcutItem } from '../../components/dashboard-shortcuts/dashboard-shortcuts.component';
import type { DashboardActivityItem, DashboardTodoItem, DashboardWidgetKey, DashboardWidgetPreferenceItem } from '../../models/dashboard.model';
import { DashboardApiService } from '../../services/dashboard-api.service';
import { DashboardStore } from '../../store/dashboard.store';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    DashboardStatGridComponent,
    MyTodosCardComponent,
    MyActivitiesCardComponent,
    LatestAnnouncementsCardComponent,
    LatestDocumentsCardComponent,
    DashboardShortcutsComponent,
    ReportedIssuesCardComponent,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSwitchModule,
  ],
  providers: [DashboardStore],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly store = inject(DashboardStore);
  readonly projectContext = inject(ProjectContextStore);
  private readonly authStore = inject(AuthStore);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);
  private readonly dashboardRefreshBus = inject(DashboardRefreshBusService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly preferencesLoading = signal(false);
  readonly preferencesSaving = signal(false);
  readonly preferenceModalVisible = signal(false);
  readonly preferenceDraft = signal<DashboardWidgetPreferenceItem[]>([]);
  readonly preferences = signal<DashboardWidgetPreferenceItem[]>([]);
  readonly canAccessReimbursementWorkspace = signal(false);
  readonly canAccessCollaborationWorkspace = signal(false);
  readonly reimbursementDashboard = signal<ReimbursementDashboard | null>(null);
  readonly reimbursementMonthStats = signal<ReimbursementStats | null>(null);
  readonly reimbursementRejectedCount = signal(0);

  readonly projectNames = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const project of this.projectContext.projects()) {
      map[project.id] = project.name;
    }
    return map;
  });
  private readonly reimbursementBaseShortcutItems: DashboardShortcutItem[] = [
    { key: 'travel-expense', label: '差旅费报销', description: '行程与交通住宿', route: '/reimbursements/new/travel', icon: 'custom:airplane', tone: 'blue' },
    { key: 'expense', label: '费用报销', description: '办公采购等', route: '/reimbursements/new/general', icon: 'file-text', tone: 'green' },
    { key: 'my-expenses', label: '我的报销', description: '查看报销进度', route: '/reimbursements/mine', icon: 'history', tone: 'amber' },
  ];
  private readonly reimbursementManagementShortcutItem: DashboardShortcutItem = {
    key: 'reimbursement-management',
    label: '报销管理',
    description: '查看和处理报销单',
    route: '/reimbursements',
    icon: 'bar-chart',
    tone: 'rose',
  };

  private readonly collaborationShortcutItems: DashboardShortcutItem[] = [
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
      key: 'profile',
      label: '个人中心',
      description: '查看并维护个人信息与偏好',
      route: '/profile',
      icon: 'user',
      tone: 'slate',
    },
  ];

  readonly reimbursementShortcutItems = computed<DashboardShortcutItem[]>(() => {
    const items = [...this.reimbursementBaseShortcutItems];
    if (this.hasReimbursementManagementPermission()) {
      items.push(this.reimbursementManagementShortcutItem);
    }
    return items;
  });

  readonly shortcutItems = computed<DashboardShortcutItem[]>(() => [
    ...(this.canAccessReimbursementWorkspace() ? this.reimbursementShortcutItems() : []),
    ...(this.canAccessCollaborationWorkspace() ? this.collaborationShortcutItems : []),
  ]);

  readonly visibleWidgets = computed(() => this.preferences().filter((item) => item.visible).sort((left, right) => left.order - right.order));
  readonly visibleDraftCount = computed(() => this.preferenceDraft().filter((item) => item.visible).length);
  readonly shouldStackInfoWidgets = computed(() => this.isWidgetVisible('collab.announcements') && this.isWidgetVisible('collab.documents'));

  readonly dashboardStatItems = computed<DashboardStatCardItem[]>(() => {
    const items: DashboardStatCardItem[] = [];
    const data = this.store.data();

    if (this.shouldShowCollaborationStats() && data) {
      items.push(
        {
          key: 'collab.assignedIssues',
          label: '待处理测试单',
          value: data.stats.assignedIssues,
          hint: '包含负责人和协作人的待处理测试单',
          icon: 'bug',
          tone: 'blue',
        },
        {
          key: 'collab.verifyingIssues',
          label: '待验证项',
          value: data.stats.verifyingIssues,
          hint: '包含待验证测试单和待验证研发项',
          icon: 'safety-certificate',
          tone: 'purple',
        },
        {
          key: 'collab.reportedUnresolvedIssues',
          label: '我提报未解决',
          value: data.stats.reportedUnresolvedIssues,
          hint: '我提报且尚未标记已解决的测试单',
          icon: 'alert',
          tone: 'cyan',
        },
        {
          key: 'collab.assignedRdItems',
          label: '未完成研发项',
          value: data.stats.assignedRdItems,
          hint: '分配给你且尚未完成的研发项',
          icon: 'rocket',
          tone: 'green',
        },
        {
          key: 'collab.myProjects',
          label: '我参与的项目数',
          value: data.stats.myProjects,
          hint: '当前可访问的项目总数',
          icon: 'team',
          tone: 'orange',
        },
      );
    }

    if (this.isWidgetVisible('reimbursement.stats')) {
      items.push(...this.reimbursementStatItems());
    }

    return items;
  });

  readonly reimbursementStatItems = computed<DashboardStatCardItem[]>(() => {
    const dashboard = this.reimbursementDashboard();
    const stats = this.reimbursementMonthStats();
    const byStatus = stats?.byStatus ?? [];
    const byMonth = stats?.byMonth ?? [];
    const todoCount = dashboard?.todoCount ?? 0;
    const approvingCount = byStatus.filter((item) => item.status === 'submitted' || item.status === 'approving').reduce((sum, item) => sum + item.count, 0);
    const completedThisMonthCount = byStatus.find((item) => item.status === 'completed')?.count ?? 0;
    const monthAmount = byMonth.reduce((sum, item) => sum + item.totalAmount, 0);
    const hasManagerStats = this.hasReimbursementManagerStatPermission();
    const hasReportStats = this.hasPermission('expense.report.view');
    const hasPersonalStats = this.hasPermission('expense.view.self');
    const items: DashboardStatCardItem[] = [];

    if (this.hasReimbursementApprovalStatPermission() || todoCount > 0) {
      items.push({
        key: 'reimbursement.approvalTodos',
        label: '待我审批',
        value: todoCount,
        hint: '分配给我的待处理报销单',
        icon: 'audit',
        tone: 'blue',
      });
    }

    if (hasManagerStats) {
      items.push({
        key: 'reimbursement.approving',
        label: '审批中',
        value: approvingCount,
        hint: '当前可管理范围内流转中的报销单',
        icon: 'safety-certificate',
        tone: 'purple',
      }, {
        key: 'reimbursement.rejected',
        label: '已驳回',
        value: this.reimbursementRejectedCount(),
        hint: '当前可管理范围内已驳回的报销单',
        icon: 'alert',
        tone: 'cyan',
      });
    }

    if (!hasManagerStats && hasPersonalStats) {
      items.push(
        {
          key: 'reimbursement.myApproving',
          label: '我的审批中',
          value: dashboard?.myApprovingCount ?? 0,
          hint: '我提交后仍在流转中的报销单',
          icon: 'safety-certificate',
          tone: 'purple',
        },
        {
          key: 'reimbursement.myRejected',
          label: '我的已驳回',
          value: this.reimbursementRejectedCount(),
          hint: '需我补充票据或说明的报销单',
          icon: 'alert',
          tone: 'cyan',
        },
      );
    }

    if (hasManagerStats || hasReportStats || hasPersonalStats) {
      items.push(
        {
          key: 'reimbursement.completedThisMonth',
          label: '本月已完成',
          value: completedThisMonthCount,
          hint: hasManagerStats || hasReportStats ? '本月完成审批的单据数' : '我本月完成审批的单据数',
          icon: 'rocket',
          tone: 'green',
        },
        {
          key: 'reimbursement.monthAmount',
          label: '本月报销金额',
          value: this.formatCurrency(monthAmount),
          hint: hasManagerStats || hasReportStats ? '本月单据金额汇总' : '我本月单据金额汇总',
          icon: 'team',
          tone: 'orange',
        },
      );
    }

    return items;
  });

  readonly mergedTodoItems = computed<DashboardTodoItem[]>(() => {
    const collabTodos = this.store.data()?.todos ?? [];
    const reimbursementTodos = (this.reimbursementDashboard()?.recentTodos ?? []).map((claim) => this.mapReimbursementTodo(claim));
    return [...collabTodos, ...reimbursementTodos]
      .sort((left, right) => this.todoSortAt(right).localeCompare(this.todoSortAt(left)))
      .slice(0, 10);
  });
  readonly mergedTodoTotal = computed(() => this.store.todosTotal() + (this.reimbursementDashboard()?.todoCount ?? 0));
  readonly todoActionLink = computed<string[]>(() => {
    if (this.canAccessCollaborationWorkspace() && this.canAccessReimbursementWorkspace()) {
      return [];
    }
    if (this.canAccessCollaborationWorkspace()) {
      return ['/dashboard/todos'];
    }
    if (this.canAccessReimbursementWorkspace()) {
      return ['/reimbursements'];
    }
    return [];
  });
  readonly mergedActivityItems = computed<DashboardActivityItem[]>(() => {
    const collabActivities = this.store.data()?.activities ?? [];
    const reimbursementActivities = (this.reimbursementDashboard()?.recentClaims ?? []).map((claim) => this.mapReimbursementActivity(claim));
    return [...collabActivities, ...reimbursementActivities]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 10);
  });

  constructor() {
    this.loadUnifiedDashboard();

    let skipFirst = true;
    effect(() => {
      const event = this.dashboardRefreshBus.event();
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      untracked(() => {
        if (this.canAccessCollaborationWorkspace()) {
          this.store.refreshByEntityTypes(event.entityTypes);
        }
      });
    });
  }

  onIssueUrged(): void {
    this.store.refreshByEntityTypes(['issue']);
  }

  openPreferenceModal(): void {
    this.preferenceDraft.set(this.preferences().map((item) => ({ ...item })));
    this.preferenceModalVisible.set(true);
  }

  closePreferenceModal(): void {
    if (this.preferencesSaving()) {
      return;
    }
    this.preferenceModalVisible.set(false);
  }

  movePreference(key: DashboardWidgetKey, offset: -1 | 1): void {
    const widgets = [...this.preferenceDraft()];
    const index = widgets.findIndex((item) => item.key === key);
    const targetIndex = index + offset;
    if (index < 0 || targetIndex < 0 || targetIndex >= widgets.length) {
      return;
    }
    const [item] = widgets.splice(index, 1);
    widgets.splice(targetIndex, 0, item);
    this.preferenceDraft.set(this.reindexWidgets(widgets));
  }

  setWidgetVisible(key: DashboardWidgetKey, visible: boolean): void {
    this.preferenceDraft.update((widgets) => widgets.map((item) => (item.key === key ? { ...item, visible } : item)));
  }

  resetPreferenceDraft(): void {
    this.preferenceDraft.set(
      this.reindexWidgets(
        [...this.preferenceDraft()]
          .sort((left, right) => left.defaultOrder - right.defaultOrder)
          .map((item) => ({ ...item, visible: item.defaultVisible })),
      ),
    );
  }

  savePreferences(): void {
    if (this.visibleDraftCount() === 0) {
      this.message.warning('至少保留一张工作台卡片');
      return;
    }

    this.preferencesSaving.set(true);
    this.dashboardApi
      .updatePreferences(this.preferenceDraft().map(({ key, visible, order }) => ({ key, visible, order })))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preferences) => {
          this.applyPreferences(preferences);
          this.preferenceModalVisible.set(false);
          this.preferencesSaving.set(false);
          this.message.success('工作台卡片配置已保存');
        },
        error: () => {
          this.preferencesSaving.set(false);
          this.message.error('保存工作台卡片配置失败');
        },
      });
  }

  isWidgetVisible(key: DashboardWidgetKey): boolean {
    return this.visibleWidgets().some((item) => item.key === key);
  }

  claimTypeLabel(claim: ReimbursementClaimEntity): string {
    return claim.claimType === 'travel' ? '差旅报销' : '费用报销';
  }

  claimStatusLabel(status: ReimbursementClaimStatus): string {
    const labels: Record<ReimbursementClaimStatus, string> = {
      draft: '草稿',
      submitted: '已提交',
      approving: '审批中',
      rejected: '已驳回',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labels[status] ?? status;
  }

  private loadUnifiedDashboard(): void {
    this.loading.set(true);
    this.preferencesLoading.set(true);
    this.dashboardApi
      .getPreferences()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preferences) => {
          this.applyPreferences(preferences);
          this.preferencesLoading.set(false);
          if (preferences.capabilities.canAccessCollaborationWorkspace || preferences.capabilities.canAccessReimbursementWorkspace) {
            this.store.load({ force: true });
          }
          if (preferences.capabilities.canAccessReimbursementWorkspace) {
            this.loadReimbursementData();
          }
          this.loading.set(false);
        },
        error: () => {
          this.preferencesLoading.set(false);
          this.loading.set(false);
          this.message.error('加载工作台配置失败');
        },
      });
  }

  private applyPreferences(preferences: { capabilities: { canAccessReimbursementWorkspace: boolean; canAccessCollaborationWorkspace: boolean }; widgets: DashboardWidgetPreferenceItem[] }): void {
    this.canAccessReimbursementWorkspace.set(preferences.capabilities.canAccessReimbursementWorkspace);
    this.canAccessCollaborationWorkspace.set(preferences.capabilities.canAccessCollaborationWorkspace);
    const widgets = [...preferences.widgets].sort((left, right) => left.order - right.order);
    this.preferences.set(widgets);
    this.preferenceDraft.set(widgets.map((item) => ({ ...item })));
  }

  private loadReimbursementData(): void {
    const { dateFrom, dateTo } = this.getCurrentMonthRange();
    forkJoin({
      dashboard: this.reimbursementApi.getDashboard(),
      monthStats: this.reimbursementApi.getStats({ dateFrom, dateTo }),
      rejectedPage: this.reimbursementApi.listClaims({ scope: this.reimbursementRejectedScope(), status: 'rejected', page: 1, pageSize: 1 }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, monthStats, rejectedPage }) => {
          this.reimbursementDashboard.set(dashboard);
          this.reimbursementMonthStats.set(monthStats);
          this.reimbursementRejectedCount.set(rejectedPage.total);
        },
        error: () => {
          this.reimbursementDashboard.set(null);
          this.reimbursementMonthStats.set(null);
          this.reimbursementRejectedCount.set(0);
          this.message.error('加载报销工作台失败');
        },
      });
  }

  private mapReimbursementTodo(claim: ReimbursementClaimEntity): DashboardTodoItem {
    return {
      kind: 'reimbursement_todo',
      entityId: claim.id,
      code: claim.claimNo,
      claimType: claim.claimType,
      title: claim.reason,
      status: claim.status,
      updatedAt: claim.submittedAt ?? claim.updatedAt ?? claim.createdAt,
      sortAt: claim.submittedAt ?? claim.updatedAt ?? claim.createdAt,
      projectId: '',
      stageName: claim.currentStageName ?? '待审批',
      applicantName: claim.applicantName,
      amount: claim.totalAmount,
    };
  }

  private mapReimbursementActivity(claim: ReimbursementClaimEntity): DashboardActivityItem {
    return {
      kind: 'reimbursement_activity',
      entityId: claim.id,
      code: claim.claimNo,
      title: claim.reason,
      action: `reimbursement.${claim.status}`,
      summary: `${this.claimTypeLabel(claim)} · ${this.claimStatusLabel(claim.status)} · ¥${claim.totalAmount.toFixed(2)}`,
      createdAt: claim.submittedAt ?? claim.updatedAt ?? claim.createdAt,
      projectId: '',
      claimType: claim.claimType,
      amount: claim.totalAmount,
      status: claim.status,
    };
  }

  private todoSortAt(item: DashboardTodoItem): string {
    return item.sortAt ?? item.updatedAt;
  }

  private getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      dateFrom: this.formatDate(firstDay),
      dateTo: this.formatDate(lastDay),
    };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private reindexWidgets(widgets: DashboardWidgetPreferenceItem[]): DashboardWidgetPreferenceItem[] {
    return widgets.map((item, index) => ({ ...item, order: index + 1 }));
  }

  private shouldShowCollaborationStats(): boolean {
    return this.canAccessCollaborationWorkspace() && (this.isWidgetVisible('collab.todos') || this.isWidgetVisible('collab.issues') || this.isWidgetVisible('collab.activities'));
  }

  private reimbursementRejectedScope(): 'my' | 'all' {
    return this.hasReimbursementGlobalStatPermission() ? 'all' : 'my';
  }

  private hasReimbursementGlobalStatPermission(): boolean {
    return this.hasReimbursementManagerStatPermission() || this.hasPermission('expense.report.view');
  }

  private hasReimbursementManagerStatPermission(): boolean {
    return this.hasReimbursementManagementPermission();
  }

  private hasReimbursementManagementPermission(): boolean {
    return this.hasAnyPermission(['expense.rule.manage', 'finance.review', 'finance.cashier']);
  }

  private hasReimbursementApprovalStatPermission(): boolean {
    return this.hasReimbursementManagementPermission();
  }

  private hasAnyPermission(codes: string[]): boolean {
    return codes.some((code) => this.hasPermission(code));
  }

  private hasPermission(code: string): boolean {
    return this.authStore.currentUser()?.permissionCodes.includes(code) ?? false;
  }
}
