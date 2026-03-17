import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService, type AdminProfile } from '../../core/services/admin-auth.service';
import { IssueManagementApiService } from '../issues/issue-management.api';
import {
  issueDisplayStatusColor,
  issueDisplayStatusLabel,
  issuePriorityColor,
  issuePriorityLabel,
  issueTypeLabel,
  type IssueItem,
  type IssueStatus,
  type ProjectOption
} from '../issues/issues.model';
import type {
  DashboardActivityItem,
  DashboardAnnouncementItem,
  DashboardDocumentItem,
  DashboardPendingItem,
  DashboardStatCardData,
  DashboardViewData
} from './models/dashboard.model';

type AnnouncementStatus = 'draft' | 'published' | 'archived';
type DocStatus = 'draft' | 'published' | 'archived';
type DocCategory = 'guide' | 'faq' | 'release-note' | 'spec' | 'policy' | 'other';

interface AnnouncementListItem {
  id: string;
  projectId?: string | null;
  title: string;
  summary?: string | null;
  pinned: boolean;
  status: AnnouncementStatus;
  publishAt?: string | null;
  updatedAt: string;
  createdAt: string;
  createdBy?: string | null;
}

interface AnnouncementListResult {
  items: AnnouncementListItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface DocListItem {
  id: string;
  projectId?: string | null;
  title: string;
  category: DocCategory;
  summary?: string | null;
  status: DocStatus;
  updatedAt: string;
  createdBy?: string | null;
}

interface DocListResult {
  items: DocListItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface ProjectIssueRef {
  issue: IssueItem;
  project: ProjectOption;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly pendingStatuses = new Set<IssueStatus>(['open', 'in_progress', 'reopened']);

  public constructor(
    private readonly api: HubApiService,
    private readonly auth: AdminAuthService,
    private readonly issueApi: IssueManagementApiService
  ) {}

  public async loadDashboard(): Promise<DashboardViewData> {
    const profile = await this.auth.ensureSession();
    if (!profile) {
      throw new Error('当前登录状态已失效，请重新登录');
    }

    const currentUserId = this.currentUserId(profile);
    const [projects, announcementResult, docResult] = await Promise.all([
      this.issueApi.listProjects(),
      firstValueFrom(
        this.api.get<AnnouncementListResult>('/api/admin/announcements', {
          params: { page: 1, pageSize: 8, status: 'published' }
        })
      ),
      firstValueFrom(
        this.api.get<DocListResult>('/api/admin/documents', {
          params: { page: 1, pageSize: 40, status: 'published' }
        })
      )
    ]);

    const issueSnapshots = await Promise.all(
      projects.map(async (project) => {
        const [assignedResult, allIssueResult] = await Promise.all([
          this.issueApi.listIssues(project.id, {
            page: 1,
            pageSize: 100,
            assigneeId: currentUserId
          }),
          this.issueApi.listIssues(project.id, {
            page: 1,
            pageSize: 100
          })
        ]);

        return {
          project,
          assigned: assignedResult.items,
          reported: allIssueResult.items.filter((item) => item.reporterId === currentUserId)
        };
      })
    );

    const assignedIssues = issueSnapshots.flatMap(({ project, assigned }) =>
      assigned.map((issue) => ({ issue, project }))
    );
    const reportedIssues = issueSnapshots.flatMap(({ project, reported }) =>
      reported.map((issue) => ({ issue, project }))
    );
    const pendingIssues = assignedIssues
      .filter(({ issue }) => this.pendingStatuses.has(issue.status))
      .sort((left, right) => this.compareTime(right.issue.updatedAt, left.issue.updatedAt));
    const verifyIssues = reportedIssues
      .filter(({ issue }) => issue.status === 'resolved')
      .sort((left, right) => this.compareTime(right.issue.updatedAt, left.issue.updatedAt));
    const recentDocs = docResult.items
      .filter((item) => this.isWithinDays(item.updatedAt, 7))
      .sort((left, right) => this.compareTime(right.updatedAt, left.updatedAt));
    const projectNameMap = new Map(projects.map((item) => [item.id, item.name]));
    const displayName = this.displayName(profile);
    const announcementCount = announcementResult.total;

    return {
      hero: {
        displayName,
        roleLabel: this.roleLabel(profile),
        summary: `你当前有 ${pendingIssues.length} 条待处理事项，${verifyIssues.length} 条待验证，${announcementCount} 条已发布公告`,
        lastLoginAt: profile.lastLoginAt ?? null
      },
      stats: this.buildStats(reportedIssues, pendingIssues, verifyIssues, recentDocs, projects, announcementCount),
      pendingItems: this.buildPendingItems(pendingIssues),
      activityItems: this.buildActivities(profile, assignedIssues, reportedIssues, docResult.items, projectNameMap).slice(0, 6),
      announcementItems: announcementResult.items.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        summary: this.withFallback(item.summary, '暂无公告摘要'),
        publishAt: item.publishAt || item.createdAt,
        badgeText: item.pinned ? '置顶' : '公告',
        route: '/announcements'
      })),
      documentItems: recentDocs.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        summary: this.withFallback(item.summary, '暂无文档摘要'),
        projectName: item.projectId ? projectNameMap.get(item.projectId) || '未命名项目' : '通用文档',
        categoryLabel: this.docCategoryLabel(item.category),
        updatedAt: item.updatedAt,
        route: '/docs'
      }))
    };
  }

  private buildStats(
    reportedIssues: ProjectIssueRef[],
    pendingIssues: ProjectIssueRef[],
    verifyIssues: ProjectIssueRef[],
    recentDocs: DocListItem[],
    projects: ProjectOption[],
    announcementCount: number
  ): DashboardStatCardData[] {
    return [
      {
        key: 'pending',
        label: '待我处理',
        value: String(pendingIssues.length),
        helper: '当前分配给我的未完成事项',
        icon: 'deployment-unit',
        tone: 'blue',
        route: '/issues'
      },
      {
        key: 'verify',
        label: '待我验证',
        value: String(verifyIssues.length),
        helper: '需要我确认或复测的事项',
        icon: 'safety-certificate',
        tone: 'violet',
        route: '/issues'
      },
      {
        key: 'reported-issues',
        label: '我提交的问题',
        value: String(reportedIssues.length),
        helper: '由我创建的问题单数量',
        icon: 'bug',
        tone: 'green',
        route: '/issues'
      },
      {
        key: 'announcements',
        label: '已发布公告',
        value: String(announcementCount),
        helper: '当前按已发布公告统计',
        icon: 'notification',
        tone: 'amber',
        route: '/announcements'
      },
      {
        key: 'docs',
        label: '最近更新文档',
        value: String(recentDocs.length),
        helper: '最近 7 天内发生更新',
        icon: 'file-text',
        tone: 'rose',
        route: '/docs'
      },
      {
        key: 'projects',
        label: '参与项目',
        value: String(projects.length),
        helper: '当前可访问的进行中项目',
        icon: 'appstore',
        tone: 'slate',
        route: '/projects'
      }
    ];
  }

  private buildPendingItems(pendingIssues: ProjectIssueRef[]): DashboardPendingItem[] {
    return pendingIssues.slice(0, 5).map(({ issue, project }) => ({
      id: issue.id,
      title: issue.title,
      typeLabel: issueTypeLabel(issue.type),
      projectName: project.name,
      statusLabel: issueDisplayStatusLabel(issue),
      statusColor: issueDisplayStatusColor(issue),
      priorityLabel: issuePriorityLabel(issue.priority),
      priorityColor: issuePriorityColor(issue.priority),
      updatedAt: issue.updatedAt,
      route: '/issues',
      queryParams: { projectId: project.id, issueId: issue.id }
    }));
  }

  private buildActivities(
    profile: AdminProfile,
    assignedIssues: ProjectIssueRef[],
    reportedIssues: ProjectIssueRef[],
    docs: DocListItem[],
    projectNameMap: Map<string, string>
  ): DashboardActivityItem[] {
    const items: DashboardActivityItem[] = [];

    for (const item of reportedIssues.slice(0, 6)) {
      items.push({
        id: `report-${item.issue.id}`,
        title: '我提交了一个问题',
        detail: `${item.issue.title} · ${item.project.name}`,
        occurredAt: item.issue.createdAt,
        icon: 'form',
        tone: 'blue',
        route: '/issues',
        queryParams: { projectId: item.project.id, issueId: item.issue.id }
      });
    }

    for (const item of assignedIssues.slice(0, 6)) {
      const isPending = item.issue.status === 'open' || item.issue.status === 'reopened';
      items.push({
        id: `assign-${item.issue.id}`,
        title: isPending ? '我被分配了一个任务' : '我处理了一个问题',
        detail: `${item.issue.title} · ${item.project.name} · ${issueDisplayStatusLabel(item.issue)}`,
        occurredAt: item.issue.updatedAt,
        icon: isPending ? 'deployment-unit' : 'tool',
        tone: isPending ? 'violet' : 'green',
        route: '/issues',
        queryParams: { projectId: item.project.id, issueId: item.issue.id }
      });
    }

    for (const doc of docs.filter((item) => this.matchesCurrentActor(item.createdBy, profile)).slice(0, 6)) {
      items.push({
        id: `doc-${doc.id}`,
        title: '我更新了一个文档',
        detail: `${doc.title} · ${doc.projectId ? projectNameMap.get(doc.projectId) || '未命名项目' : '通用文档'}`,
        occurredAt: doc.updatedAt,
        icon: 'file-text',
        tone: 'amber',
        route: '/docs'
      });
    }

    return items.sort((left, right) => this.compareTime(right.occurredAt, left.occurredAt));
  }

  private currentUserId(profile: AdminProfile): string {
    return profile.userId?.trim() || profile.id;
  }

  private displayName(profile: AdminProfile): string {
    const name = profile.nickname?.trim();
    return name && name.length > 0 ? name : profile.username;
  }

  private roleLabel(profile: AdminProfile): string {
    return profile.role === 'admin' ? '管理员' : '项目成员';
  }

  private matchesCurrentActor(createdBy: string | null | undefined, profile: AdminProfile): boolean {
    const actor = createdBy?.trim().toLowerCase();
    if (!actor) {
      return false;
    }

    const candidates = [profile.id, profile.userId, profile.username, profile.nickname]
      .filter((item): item is string => !!item && item.trim().length > 0)
      .map((item) => item.trim().toLowerCase());

    return candidates.includes(actor);
  }

  private docCategoryLabel(category: DocCategory): string {
    switch (category) {
      case 'guide':
        return '指南';
      case 'faq':
        return 'FAQ';
      case 'release-note':
        return '发布说明';
      case 'spec':
        return '规范';
      case 'policy':
        return '策略';
      default:
        return '其他';
    }
  }

  private withFallback(value: string | null | undefined, fallback: string): string {
    const text = value?.trim();
    return text && text.length > 0 ? text : fallback;
  }

  private isWithinDays(value: string, days: number): boolean {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return false;
    }

    return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
  }

  private compareTime(left: string, right: string): number {
    return this.safeTime(left) - this.safeTime(right);
  }

  private safeTime(value: string | null | undefined): number {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}

