import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { HubApiError } from '../../core/http/api-error.interceptor';
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

  private async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.dashboardService.loadDashboard();
      this.applyData(data);
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载仪表盘失败'));
    } finally {
      this.loading.set(false);
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
