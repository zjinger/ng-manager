import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { firstValueFrom } from 'rxjs';
import { HubApiService } from '../../core/http/hub-api.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

type FeedbackType = 'bug' | 'suggestion' | 'feature' | 'other';
type AnnouncementStatus = 'draft' | 'published' | 'archived';

interface DashboardStat {
  key: string;
  label: string;
  value: string;
  icon: string;
  colorClass: string;
}

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  content: string;
  timeText: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  publishDate: string;
  status: AnnouncementStatus;
}

interface FeedbackEntity {
  id: string;
  category: FeedbackType;
  title: string;
  content: string;
  createdAt: string;
}

interface FeedbackListResult {
  items: FeedbackEntity[];
  page: number;
  pageSize: number;
  total: number;
}

interface AnnouncementListItem {
  id: string;
  title: string;
  summary?: string | null;
  status: AnnouncementStatus;
  publishAt?: string | null;
  createdAt: string;
}

interface AnnouncementListResult {
  items: AnnouncementListItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface ProjectListResult {
  items: Array<{ id: string }>;
  page: number;
  pageSize: number;
  total: number;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzIconModule,
    NzBadgeModule,
    NzTagModule,
    NzButtonModule,
    NzGridModule,
    PageHeaderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less']
})
export class DashboardPageComponent {
  private readonly api = inject(HubApiService);
  private readonly router = inject(Router);

  readonly stats = signal<DashboardStat[]>([
    {
      key: 'feedbackTotal',
      label: '反馈总数',
      value: '-',
      icon: 'message',
      colorClass: 'stat-blue'
    },
    {
      key: 'feedbackPending',
      label: '待处理反馈',
      value: '-',
      icon: 'info-circle',
      colorClass: 'stat-purple'
    },
    {
      key: 'projectTotal',
      label: '项目总数',
      value: '-',
      icon: 'branches',
      colorClass: 'stat-orange'
    },
    {
      key: 'announcementTotal',
      label: '公告总数',
      value: '-',
      icon: 'notification',
      colorClass: 'stat-green'
    }
  ]);

  readonly recentFeedbacks = signal<FeedbackItem[]>([]);
  readonly importantAnnouncements = signal<AnnouncementItem[]>([]);

  readonly pageTitle = computed(() => '仪表盘');
  readonly pageDesc = computed(() => '系统概览和关键信息');

  public constructor() {
    void this.loadDashboard();
  }

  feedbackTag(type: FeedbackType): { text: string; color: string } {
    switch (type) {
      case 'bug':
        return { text: '问题', color: 'blue' };
      case 'suggestion':
        return { text: '建议', color: 'purple' };
      case 'feature':
        return { text: '功能请求', color: 'green' };
      default:
        return { text: '其他', color: 'default' };
    }
  }

  announcementTag(status: AnnouncementStatus): { text: string; className: string } {
    switch (status) {
      case 'published':
        return { text: '已发布', className: 'status-published' };
      case 'draft':
        return { text: '草稿', className: 'status-draft' };
      case 'archived':
        return { text: '已归档', className: 'status-archived' };
      default:
        return { text: '未知', className: 'status-archived' };
    }
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }

  onViewAllFeedback() {
    void this.router.navigateByUrl('/feedback');
  }

  onViewAllAnnouncements() {
    void this.router.navigateByUrl('/announcements');
  }

  private async loadDashboard(): Promise<void> {
    const [feedbackAll, feedbackOpen, feedbackProcessing, projectList, announcementList, recentFeedbacks] =
      await Promise.all([
        firstValueFrom(
          this.api.get<FeedbackListResult>('/api/admin/feedbacks', {
            params: { page: 1, pageSize: 1 }
          })
        ),
        firstValueFrom(
          this.api.get<FeedbackListResult>('/api/admin/feedbacks', {
            params: { status: 'open', page: 1, pageSize: 1 }
          })
        ),
        firstValueFrom(
          this.api.get<FeedbackListResult>('/api/admin/feedbacks', {
            params: { status: 'processing', page: 1, pageSize: 1 }
          })
        ),
        firstValueFrom(
          this.api.get<ProjectListResult>('/api/admin/projects', {
            params: { page: 1, pageSize: 1 }
          })
        ),
        firstValueFrom(
          this.api.get<AnnouncementListResult>('/api/admin/announcements', {
            params: { page: 1, pageSize: 3, pinned: true }
          })
        ),
        firstValueFrom(
          this.api.get<FeedbackListResult>('/api/admin/feedbacks', {
            params: { page: 1, pageSize: 3 }
          })
        )
      ]);

    this.stats.set([
      {
        key: 'feedbackTotal',
        label: '反馈总数',
        value: String(feedbackAll.total),
        icon: 'message',
        colorClass: 'stat-blue'
      },
      {
        key: 'feedbackPending',
        label: '待处理反馈',
        value: String(feedbackOpen.total + feedbackProcessing.total),
        icon: 'info-circle',
        colorClass: 'stat-purple'
      },
      {
        key: 'projectTotal',
        label: '项目总数',
        value: String(projectList.total),
        icon: 'appstore',
        colorClass: 'stat-orange'
      },
      {
        key: 'announcementTotal',
        label: '公告总数',
        value: String(announcementList.total),
        icon: 'notification',
        colorClass: 'stat-green'
      }
    ]);

    this.recentFeedbacks.set(
      recentFeedbacks.items.map((item) => ({
        id: item.id,
        type: item.category,
        title: item.title,
        content: item.content,
        timeText: this.formatTimeText(item.createdAt)
      }))
    );

    this.importantAnnouncements.set(
      announcementList.items.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.summary?.trim() ? item.summary : '无摘要',
        publishDate: (item.publishAt || item.createdAt).slice(0, 10),
        status: item.status
      }))
    );
  }

  private formatTimeText(value: string): string {
    const target = Date.parse(value);
    if (Number.isNaN(target)) {
      return value;
    }

    const diffMs = Date.now() - target;
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) {
      return '刚刚';
    }
    if (minutes < 60) {
      return `${minutes}分钟前`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}小时前`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days}天前`;
    }

    return value.slice(0, 10);
  }
}

