import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';

type FeedbackType = 'bug' | 'suggestion' | 'feature';
type AnnouncementStatus = 'published' | 'processing' | 'done';

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
    NzGridModule
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.less']
})
export class DashboardPageComponent {
  readonly stats = signal<DashboardStat[]>([
    {
      key: 'feedbackTotal',
      label: '反馈总数',
      value: '1,248',
      icon: 'message',
      colorClass: 'stat-blue'
    },
    {
      key: 'feedbackPending',
      label: '未处理反馈',
      value: '42',
      icon: 'info-circle',
      colorClass: 'stat-purple'
    },
    {
      key: 'latestVersion',
      label: '最新版本',
      value: 'v2.1.3',
      icon: 'branches',
      colorClass: 'stat-orange'
    },
    {
      key: 'recentAnnouncements',
      label: '最近公告',
      value: '3 条',
      icon: 'notification',
      colorClass: 'stat-green'
    }
  ]);

  readonly recentFeedbacks = signal<FeedbackItem[]>([
    {
      id: '1',
      type: 'bug',
      title: 'CLI 命令执行失败',
      content: '在执行 ngm deploy 命令时出现错误，提示“无法连接到服务器”，错误代码 500。',
      timeText: '2小时前'
    },
    {
      id: '2',
      type: 'suggestion',
      title: '增加文档搜索功能',
      content: '建议在文档中心增加全文搜索功能，方便用户快速找到所需内容。',
      timeText: '5小时前'
    },
    {
      id: '3',
      type: 'feature',
      title: '支持多环境部署',
      content: '希望增加支持同时部署测试环境和生产环境的功能。',
      timeText: '1天前'
    }
  ]);

  readonly importantAnnouncements = signal<AnnouncementItem[]>([
    {
      id: '1',
      title: 'v2.1.3 版本发布',
      content: '本次更新包含多项性能优化和 bug 修复，建议所有用户尽快升级。',
      publishDate: '2023-06-15',
      status: 'published'
    },
    {
      id: '2',
      title: '系统维护通知',
      content: '计划于 2023-06-20 02:00-04:00 进行系统维护，期间服务可能短暂不可用。',
      publishDate: '2023-06-14',
      status: 'processing'
    },
    {
      id: '3',
      title: '文档中心更新',
      content: '文档中心已更新 API 参考部分，新增了 10 个接口文档。',
      publishDate: '2023-06-12',
      status: 'done'
    }
  ]);

  readonly pageTitle = computed(() => '仪表盘');
  readonly pageDesc = computed(() => '系统概览和关键信息');

  feedbackTag(type: FeedbackType): { text: string; color: string } {
    switch (type) {
      case 'bug':
        return { text: '问题', color: 'blue' };
      case 'suggestion':
        return { text: '建议', color: 'purple' };
      case 'feature':
        return { text: '功能请求', color: 'green' };
      default:
        return { text: '未知', color: 'default' };
    }
  }

  announcementTag(status: AnnouncementStatus): { text: string; color: string } {
    switch (status) {
      case 'published':
        return { text: '已发布', color: 'success' };
      case 'processing':
        return { text: '进行中', color: 'warning' };
      case 'done':
        return { text: '已完成', color: 'processing' };
      default:
        return { text: '未知', color: 'default' };
    }
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }

  onViewAllFeedback() {
    // TODO: 跳转到反馈管理页
    console.log('[dashboard] 查看全部反馈');
  }

  onViewAllAnnouncements() {
    // TODO: 跳转到公告管理页
    console.log('[dashboard] 查看全部公告');
  }
}