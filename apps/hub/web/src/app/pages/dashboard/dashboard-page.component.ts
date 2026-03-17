import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { filter } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubWsEventType, HubWebsocketService } from '../../core/services/hub-websocket.service';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import { DashboardActivityListComponent } from './components/dashboard-activity-list.component';
import { DashboardAnnouncementPanelComponent } from './components/dashboard-announcement-panel.component';
import { DashboardDocumentPanelComponent } from './components/dashboard-document-panel.component';
import { DashboardHeroComponent } from './components/dashboard-hero.component';
import { DashboardPendingListComponent } from './components/dashboard-pending-list.component';
import { DashboardShortcutsComponent } from './components/dashboard-shortcuts.component';
import { DashboardStatGridComponent } from './components/dashboard-stat-grid.component';
import type {
  DashboardActivityItem,
  DashboardAnnouncementItem,
  DashboardDocumentItem,
  DashboardHeroData,
  DashboardIssuePriorityScope,
  DashboardPendingItem,
  DashboardProjectOption,
  DashboardShortcutItem,
  DashboardStatCardData,
  DashboardStatCardKey,
  DashboardStatCardPreferenceItem,
  DashboardViewData
} from './models/dashboard.model';
import { DashboardService } from './dashboard.service';

const DASHBOARD_PREFERENCE_TIMEOUT_MS = 8000;
const EMPTY_PROJECT_IDS: string[] = [];

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzAlertModule,
    NzButtonModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzSwitchModule,
    DashboardHeroComponent,
    DashboardStatGridComponent,
    DashboardPendingListComponent,
    DashboardActivityListComponent,
    DashboardAnnouncementPanelComponent,
    DashboardDocumentPanelComponent,
    DashboardShortcutsComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.less'],
  styles: [PAGE_SHELL_STYLES]
})
export class DashboardPageComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly ws = inject(HubWebsocketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly message = inject(NzMessageService);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly hero = signal<DashboardHeroData | null>(null);
  protected readonly stats = signal<DashboardStatCardData[]>([]);
  protected readonly pendingItems = signal<DashboardPendingItem[]>([]);
  protected readonly activityItems = signal<DashboardActivityItem[]>([]);
  protected readonly announcementItems = signal<DashboardAnnouncementItem[]>([]);
  protected readonly documentItems = signal<DashboardDocumentItem[]>([]);
  protected readonly statPreferenceModalVisible = signal(false);
  protected readonly statPreferenceLoading = signal(false);
  protected readonly statPreferenceSaving = signal(false);
  protected readonly statPreferenceLoaded = signal(false);
  protected readonly statPreferenceCards = signal<DashboardStatCardPreferenceItem[]>([]);
  protected readonly statPreferenceProjects = signal<DashboardProjectOption[]>([]);

  protected readonly priorityScopeOptions: Array<{ label: string; value: DashboardIssuePriorityScope }> = [
    { label: '全部优先级', value: 'all' },
    { label: '高优先级及以上', value: 'high_up' },
    { label: '仅紧急', value: 'critical' }
  ];

  protected readonly shortcutItems: DashboardShortcutItem[] = [
    {
      key: 'create-issue',
      label: '提交测试问题',
      description: '进入测试问题提报页',
      icon: 'form',
      tone: 'blue',
      route: '/issues/new'
    },
    {
      key: 'my-issues',
      label: '查看我的事项',
      description: '快速进入问题处理列表',
      icon: 'profile',
      tone: 'violet',
      route: '/issues'
    },
    {
      key: 'project-docs',
      label: '查看项目文档',
      description: '浏览最新规范与文档更新',
      icon: 'file-text',
      tone: 'green',
      route: '/docs'
    },
    {
      key: 'announcements',
      label: '查看公告',
      description: '获取项目与系统通知',
      icon: 'notification',
      tone: 'amber',
      route: '/announcements'
    },
    {
      key: 'profile',
      label: '个人资料',
      description: '维护头像和账号信息',
      icon: 'user',
      tone: 'rose',
      route: '/profile'
    },
    {
      key: 'password',
      label: '修改密码',
      description: '进入密码设置页签',
      icon: 'lock',
      tone: 'slate',
      route: '/profile',
      queryParams: { tab: 'password' }
    }
  ];

  protected readonly visibleStatCardCount = computed(() => this.statPreferenceCards().filter((item) => item.enabled).length);

  public constructor() {
    void this.loadDashboard();
    void this.preloadStatPreferences();

    this.ws.events$
      .pipe(
        filter((event) => this.isRealtimeDashboardEvent(event.type)),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.scheduleRealtimeRefresh();
      });

    this.destroyRef.onDestroy(() => {
      if (this.refreshTimer !== null) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    });
  }

  protected reload(): void {
    void this.loadDashboard();
  }

  protected openProfile(): void {
    void this.router.navigate(['/profile']);
  }

  protected openPassword(): void {
    void this.router.navigate(['/profile'], { queryParams: { tab: 'password' } });
  }

  protected openStatPreferenceModal(): void {
    this.statPreferenceModalVisible.set(true);
    void this.ensureStatPreferencesLoaded(true);
  }

  protected closeStatPreferenceModal(): void {
    if (this.statPreferenceSaving()) {
      return;
    }
    this.statPreferenceModalVisible.set(false);
  }

  protected moveStatPreference(key: DashboardStatCardKey, offset: -1 | 1): void {
    const cards = [...this.statPreferenceCards()];
    const index = cards.findIndex((item) => item.key === key);
    const targetIndex = index + offset;
    if (index < 0 || targetIndex < 0 || targetIndex >= cards.length) {
      return;
    }

    const [item] = cards.splice(index, 1);
    cards.splice(targetIndex, 0, item);
    this.statPreferenceCards.set(this.reindexStatPreferences(cards));
  }

  protected setStatPreferenceEnabled(key: DashboardStatCardKey, enabled: boolean): void {
    this.updatePreferenceCard(key, (item) => ({ ...item, enabled }));
  }

  protected setPriorityScope(key: DashboardStatCardKey, value: DashboardIssuePriorityScope): void {
    this.updatePreferenceCard(key, (item) => ({
      ...item,
      filters: {
        ...item.filters,
        priorityScope: value
      }
    }));
  }

  protected setProjectScope(key: DashboardStatCardKey, projectIds: string[]): void {
    const normalizedProjectIds = this.normalizeProjectIds(projectIds);
    this.updatePreferenceCard(key, (item) => {
      const nextFilters = { ...item.filters };
      if (normalizedProjectIds.length > 0 && normalizedProjectIds.length < this.statPreferenceProjects().length) {
        nextFilters.projectIds = normalizedProjectIds;
      } else {
        delete nextFilters.projectIds;
      }

      return {
        ...item,
        filters: Object.keys(nextFilters).length > 0 ? nextFilters : undefined
      };
    });
  }

  protected resetStatPreferences(): void {
    const defaults = [...this.statPreferenceCards()]
      .sort((left, right) => left.defaultOrder - right.defaultOrder)
      .map((item) => ({
        ...item,
        enabled: item.defaultEnabled,
        order: item.defaultOrder,
        filters: undefined
      }));
    this.statPreferenceCards.set(this.reindexStatPreferences(defaults));
  }

  protected getPriorityScope(item: DashboardStatCardPreferenceItem): DashboardIssuePriorityScope {
    return item.filters?.priorityScope ?? 'all';
  }

  protected getProjectScope(item: DashboardStatCardPreferenceItem): string[] {
    return item.filters?.projectIds ?? EMPTY_PROJECT_IDS;
  }

  protected getProjectScopeLabel(item: DashboardStatCardPreferenceItem): string {
    if (!item.supportsProjectIds || this.statPreferenceProjects().length <= 1) {
      return '无需项目过滤';
    }

    const projectIds = item.filters?.projectIds ?? EMPTY_PROJECT_IDS;
    if (projectIds.length === 0) {
      return '全部项目';
    }

    return `已选 ${projectIds.length} 个项目`;
  }

  protected async saveStatPreferences(): Promise<void> {
    if (this.visibleStatCardCount() === 0) {
      this.message.warning('至少保留一张统计卡片');
      return;
    }

    this.statPreferenceSaving.set(true);
    try {
      const result = await this.withTimeout(
        this.dashboardService.updateStatPreferences(this.statPreferenceCards()),
        DASHBOARD_PREFERENCE_TIMEOUT_MS,
        '保存 Dashboard 卡片配置超时'
      );
      this.applyStatPreferenceResult(result.cards, result.availableProjects);
      this.statPreferenceLoaded.set(true);
      this.statPreferenceModalVisible.set(false);
      this.message.success('Dashboard 卡片配置已更新');
      await this.loadDashboard(false);
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '保存 Dashboard 卡片配置失败'));
    } finally {
      this.statPreferenceSaving.set(false);
    }
  }

  private async preloadStatPreferences(): Promise<void> {
    try {
      await this.ensureStatPreferencesLoaded(false);
    } catch {
      // ignore preload failures and allow manual retry when opening the modal
    }
  }

  private async ensureStatPreferencesLoaded(showErrorMessage: boolean): Promise<void> {
    if (this.statPreferenceLoaded() || this.statPreferenceLoading()) {
      return;
    }

    this.statPreferenceLoading.set(true);
    try {
      const result = await this.withTimeout(
        this.dashboardService.loadStatPreferences(),
        DASHBOARD_PREFERENCE_TIMEOUT_MS,
        '加载 Dashboard 卡片配置超时'
      );
      this.applyStatPreferenceResult(result.cards, result.availableProjects);
      this.statPreferenceLoaded.set(true);
    } catch (error) {
      if (showErrorMessage) {
        this.message.error(this.resolveErrorMessage(error, '加载 Dashboard 卡片配置失败'));
      }
      throw error;
    } finally {
      this.statPreferenceLoading.set(false);
    }
  }

  private applyStatPreferenceResult(cards: DashboardStatCardPreferenceItem[], projects: DashboardProjectOption[]): void {
    this.statPreferenceProjects.set(projects);
    this.statPreferenceCards.set(this.sortStatPreferences(cards));
  }

  private updatePreferenceCard(
    key: DashboardStatCardKey,
    updater: (item: DashboardStatCardPreferenceItem) => DashboardStatCardPreferenceItem
  ): void {
    this.statPreferenceCards.update((items) => items.map((item) => (item.key === key ? updater(item) : item)));
  }

  private normalizeProjectIds(projectIds: string[]): string[] {
    return Array.from(new Set((projectIds || []).map((item) => item.trim()).filter(Boolean)));
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        })
      ]);
    } finally {
      if (timer !== null) {
        clearTimeout(timer);
      }
    }
  }

  private scheduleRealtimeRefresh(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.loadDashboard(false);
    }, 300);
  }

  private async loadDashboard(showLoading = true): Promise<void> {
    if (showLoading) {
      this.loading.set(true);
      this.errorMessage.set(null);
    }

    try {
      const data = await this.dashboardService.loadDashboard();
      this.applyData(data);
      if (showLoading) {
        this.errorMessage.set(null);
      }
    } catch (error) {
      if (showLoading) {
        this.errorMessage.set(this.resolveErrorMessage(error, '加载仪表盘失败'));
      }
    } finally {
      if (showLoading) {
        this.loading.set(false);
      }
    }
  }

  private applyData(data: DashboardViewData): void {
    this.hero.set(data.hero);
    this.stats.set(data.stats);
    this.pendingItems.set(data.pendingItems);
    this.activityItems.set(data.activityItems);
    this.announcementItems.set(data.announcementItems);
    this.documentItems.set(data.documentItems);
  }

  private isRealtimeDashboardEvent(type: HubWsEventType): boolean {
    return (
      type === 'issue.created' ||
      type === 'issue.updated' ||
      type === 'rd.created' ||
      type === 'rd.updated' ||
      type === 'announcement.published' ||
      type === 'announcement.updated' ||
      type === 'doc.published' ||
      type === 'doc.updated'
    );
  }

  private sortStatPreferences(cards: DashboardStatCardPreferenceItem[]): DashboardStatCardPreferenceItem[] {
    return this.reindexStatPreferences(
      [...cards].sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return left.defaultOrder - right.defaultOrder;
      })
    );
  }

  private reindexStatPreferences(cards: DashboardStatCardPreferenceItem[]): DashboardStatCardPreferenceItem[] {
    return cards.map((item, index) => ({
      ...item,
      order: index + 1
    }));
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) {
      return error.message;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }
}
