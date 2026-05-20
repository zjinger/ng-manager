import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeaderComponent } from '@shared/ui';
import { AuthStore } from '@core/auth';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import type { AnnouncementEntity } from '../../../../content/models/content.model';
import { ContentApiService } from '../../../../content/services/content-api.service';
import type { ReimbursementClaimEntity, ReimbursementDashboard, ReimbursementStats } from '../../../models/reimbursement.model';
import { ReimbursementApiService } from '../../../services/reimbursement-api.service';
import { MyTodosCardComponent, type TodoItem } from '../../components/my-todos-card/my-todos-card';
import { QuickAccessCardComponent } from '../../components/quick-access-card/quick-access-card';
import { ReAnnouncementsComponent } from '../../components/re-announcements-card/re-announcements-card';
import { ReDashboardPanelComponent, type ReDashboardStatKey, type ReDashboardStats } from '../../components/re-dashboard-panel/re-dashboard-panel';

type AnnouncementItem = {
  id: string;
  title: string;
  summary: string;
  publishAt: string;
  pinned: boolean;
  projectId: string | null;
};

@Component({
  selector: 'app-re-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    ReDashboardPanelComponent,
    MyTodosCardComponent,
    NzButtonModule,
    PageHeaderComponent,
    NzPopconfirmModule,
    NzIconModule,
    QuickAccessCardComponent,
    ReAnnouncementsComponent,
  ],
  templateUrl: './re-dashboard-page.component.html',
  styleUrls: ['./re-dashboard-page.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReDashboardPageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly dashboard = signal<ReimbursementDashboard | null>(null);
  readonly monthStats = signal<ReimbursementStats | null>(null);
  readonly rejectedCount = signal(0);

  readonly stats = computed<ReDashboardStats>(() => {
    const dashboard = this.dashboard();
    const stats = this.monthStats();
    const byStatus = stats?.byStatus ?? [];
    const byMonth = stats?.byMonth ?? [];

    return {
      todoCount: dashboard?.todoCount ?? 0,
      myApprovingCount: dashboard?.myApprovingCount ?? 0,
      rejectedCount: this.rejectedCount(),
      completedThisMonthCount: byStatus.find((item) => item.status === 'completed')?.count ?? 0,
      monthAmount: byMonth.reduce((sum, item) => sum + item.totalAmount, 0),
    };
  });
  readonly statKeys = computed<ReDashboardStatKey[]>(() => {
    const keys: ReDashboardStatKey[] = [];
    const todoCount = this.dashboard()?.todoCount ?? 0;
    if (this.hasReimbursementApprovalPermission() || todoCount > 0) {
      keys.push('approvalTodos');
    }
    if (this.hasPersonalReimbursementPermission()) {
      keys.push('myApproving', 'myRejected', 'myCompletedThisMonth', 'myMonthAmount');
    } else if (this.reportMode()) {
      keys.push('myCompletedThisMonth', 'myMonthAmount');
    }
    return keys;
  });
  readonly reportMode = computed(() => this.hasPermission('expense.report.view'));

  readonly todoItems = computed<TodoItem[]>(() => this.mapTodoItems(this.dashboard()?.recentTodos ?? []));
  readonly todoTotal = computed(() => this.dashboard()?.todoCount ?? 0);

  readonly announcements = signal<AnnouncementItem[]>([]);

  constructor() {
    this.load();
  }

  private load(): void {
    const { dateFrom, dateTo } = this.getCurrentMonthRange();
    this.loading.set(true);

    forkJoin({
      dashboard: this.reimbursementApi.getDashboard(),
      monthStats: this.reimbursementApi.getStats({ dateFrom, dateTo }),
      rejectedPage: this.reimbursementApi.listClaims({ scope: 'my', status: 'rejected', page: 1, pageSize: 1 }),
      announcements: this.contentApi.listAnnouncements({
        domain: 'reimbursement',
        status: 'published',
        page: 1,
        pageSize: 5,
      }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, monthStats, rejectedPage, announcements }) => {
          this.dashboard.set(dashboard);
          this.monthStats.set(monthStats);
          this.rejectedCount.set(rejectedPage.total);
          this.announcements.set(announcements.items.map((item) => this.mapAnnouncement(item)));
          this.loading.set(false);
        },
        error: () => {
          this.dashboard.set(null);
          this.monthStats.set(null);
          this.rejectedCount.set(0);
          this.announcements.set([]);
          this.loading.set(false);
          this.message.error('加载报销工作台失败');
        },
      });
  }

  private mapAnnouncement(item: AnnouncementEntity): AnnouncementItem {
    return {
      id: item.id,
      title: item.title,
      summary: item.summary ?? '',
      publishAt: item.publishAt ?? item.updatedAt,
      pinned: item.pinned,
      projectId: item.projectId,
    };
  }

  private mapTodoItems(claims: ReimbursementClaimEntity[]): TodoItem[] {
    return claims.map((claim) => ({
      id: claim.id,
      code: claim.claimNo,
      claimType: claim.claimType,
      stageCode: claim.currentStageCode,
      stageName: claim.currentStageName ?? '待审批',
      title: claim.reason,
      applicant: claim.applicantName,
      amount: claim.totalAmount,
      waitingHours: this.diffHours(claim.submittedAt ?? claim.createdAt),
      claimId: claim.id,
      highAmount: claim.totalAmount >= 5000,
    }));
  }

  private diffHours(startAt: string): number {
    const started = new Date(startAt).getTime();
    if (Number.isNaN(started)) {
      return 0;
    }
    const diff = Date.now() - started;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  }

  private getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
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

  private hasPersonalReimbursementPermission(): boolean {
    return this.hasPermission('expense.submit') || this.hasPermission('expense.view.self');
  }

  private hasReimbursementApprovalPermission(): boolean {
    return this.hasAnyPermission(['approval.department', 'approval.cross_department', 'finance.review', 'finance.cashier']);
  }

  private hasAnyPermission(codes: string[]): boolean {
    return codes.some((code) => this.hasPermission(code));
  }

  private hasPermission(code: string): boolean {
    return this.authStore.currentUser()?.permissionCodes.includes(code) ?? false;
  }
}
