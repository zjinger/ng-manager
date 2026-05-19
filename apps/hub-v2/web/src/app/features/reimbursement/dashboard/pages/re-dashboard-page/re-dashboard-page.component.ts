import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeaderComponent } from '@shared/ui';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import type { ReimbursementClaimEntity, ReimbursementDashboard, ReimbursementStats } from '../../../models/reimbursement.model';
import { ReimbursementApiService } from '../../../services/reimbursement-api.service';
import { MyTodosCardComponent, type TodoItem } from '../../components/my-todos-card/my-todos-card';
import { QuickAccessCardComponent } from '../../components/quick-access-card/quick-access-card';
import { ReAnnouncementsComponent } from '../../components/re-announcements-card/re-announcements-card';
import { ReDashboardPanelComponent, type ReDashboardStats } from '../../components/re-dashboard-panel/re-dashboard-panel';

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
  private readonly reimbursementApi = inject(ReimbursementApiService);
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

  readonly todoItems = computed<TodoItem[]>(() => this.mapTodoItems(this.dashboard()?.recentTodos ?? []));
  readonly todoTotal = computed(() => this.dashboard()?.todoCount ?? 0);

  readonly announcements: AnnouncementItem[] = [
    {
      id: '1',
      title: '关于2025年第一季度报销截止日期的通知',
      summary: '请各部门注意，第一季度报销截止日期为2025年3月31日，逾期将不再受理。',
      publishAt: '2025-03-15T09:00:00',
      pinned: true,
      projectId: null,
    },
    {
      id: '2',
      title: '差旅费报销标准调整公告',
      summary: '根据公司最新政策，自2025年4月1日起，差旅费报销标准将进行调整。',
      publishAt: '2025-03-10T14:30:00',
      pinned: true,
      projectId: null,
    },
    {
      id: '3',
      title: '关于报销发票合规性要求的提醒',
      summary: '近期发现部分报销发票存在合规性问题，请务必按照财务规定提供发票。',
      publishAt: '2025-03-01T11:00:00',
      pinned: false,
      projectId: null,
    },
  ];

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
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, monthStats, rejectedPage }) => {
          this.dashboard.set(dashboard);
          this.monthStats.set(monthStats);
          this.rejectedCount.set(rejectedPage.total);
          this.loading.set(false);
        },
        error: () => {
          this.dashboard.set(null);
          this.monthStats.set(null);
          this.rejectedCount.set(0);
          this.loading.set(false);
          this.message.error('加载报销工作台失败');
        },
      });
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
}
