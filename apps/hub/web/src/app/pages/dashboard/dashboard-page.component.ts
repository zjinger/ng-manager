import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
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
  DashboardPendingItem,
  DashboardShortcutItem,
  DashboardStatCardData,
  DashboardViewData
} from './models/dashboard.model';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    NzAlertModule,
    NzButtonModule,
    NzSpinModule,
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
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly hero = signal<DashboardHeroData | null>(null);
  protected readonly stats = signal<DashboardStatCardData[]>([]);
  protected readonly pendingItems = signal<DashboardPendingItem[]>([]);
  protected readonly activityItems = signal<DashboardActivityItem[]>([]);
  protected readonly announcementItems = signal<DashboardAnnouncementItem[]>([]);
  protected readonly documentItems = signal<DashboardDocumentItem[]>([]);

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

  public constructor() {
    void this.loadDashboard();

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

  /**
   * dashboard 相关的实时事件包括：
   * - issue.created / issue.updated：测试问题的创建和更新事件，影响待办事项和活动动态
   * - announcement.published / announcement.updated：公告的发布和更新事件，影响公告面板
   * - doc.published / doc.updated：文档的发布和更新事件，影响文档面板
   * 这些事件发生后会触发仪表盘数据的刷新，以确保用户看到最新的信息。
   * 由于可能会有短时间内的多次相关事件（例如批量更新问题），因此刷新会有一个短暂的延迟（300ms），以避免重复刷新。
   */
  private isRealtimeDashboardEvent(type: HubWsEventType): boolean {
    return (
      type === 'issue.created' ||
      type === 'issue.updated' ||
      type === 'announcement.published' ||
      type === 'announcement.updated' ||
      type === 'doc.published' ||
      type === 'doc.updated'
    );
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
