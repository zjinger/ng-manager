import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { filter, firstValueFrom } from 'rxjs';
import { HubApiError } from './core/http/api-error.interceptor';
import { HubApiService } from './core/http/hub-api.service';
import { AdminAuthService } from './core/services/admin-auth.service';
import { HubWsEventType, HubWebsocketService } from './core/services/hub-websocket.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ProjectContextService } from './core/services/project-context.service';

type AnnouncementStatus = 'draft' | 'published' | 'archived';

interface HeaderAnnouncementItem {
  id: string;
  projectId?: string | null;
  title: string;
  summary?: string | null;
  pinned: boolean;
  status: AnnouncementStatus;
  publishAt?: string | null;
  updatedAt: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
  readVersion?: string | null;
}

interface HeaderAnnouncementListResult {
  items: HeaderAnnouncementItem[];
  page: number;
  pageSize: number;
  total: number;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzBadgeModule,
    NzDropDownModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzAlertModule,
    FormsModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
})
export class App {
  protected readonly title = signal('NGM Admin');
  protected readonly ws = inject(HubWebsocketService);
  protected readonly isLoginPage = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly auth = inject(AdminAuthService);
  protected readonly announcementLoading = signal(false);
  protected readonly announcementItems = signal<HeaderAnnouncementItem[]>([]);
  protected readonly projectContext = inject(ProjectContextService);
  private readonly projectsLoaded = signal(false);

  protected readonly mustChangePasswordVisible = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly changePasswordError = signal<string | null>(null);

  protected readonly unreadAnnouncements = computed(() =>
    this.announcementItems().filter((item) => !item.isRead),
  );
  protected readonly unreadCount = computed(() => this.unreadAnnouncements().length);

  protected readonly displayName = computed(() => {
    const profile = this.auth.profile();
    if (!profile) {
      return '未登录';
    }

    if (profile.nickname && profile.nickname.trim().length > 0) {
      return profile.nickname.trim();
    }

    return profile.username;
  });

  protected readonly currentAvatarUrl = computed(() => {
    const profile = this.auth.profile();
    if (!profile?.avatarUrl) {
      return null;
    }
    const separator = profile.avatarUrl.includes('?') ? '&' : '?';
    return `${profile.avatarUrl}${separator}v=${encodeURIComponent(profile.updatedAt)}`;
  });

  protected readonly avatarText = computed(() => {
    const profile = this.auth.profile();
    if (!profile) {
      return 'NA';
    }

    const source = (profile.nickname?.trim() || profile.username).trim();
    if (source.length === 0) {
      return 'AD';
    }

    return source.slice(0, 1).toUpperCase();
  });

  private readonly router = inject(Router);
  private readonly notification = inject(NzNotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);

  protected readonly passwordForm = this.fb.nonNullable.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  public constructor() {
    this.updateRouteState();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.updateRouteState());

    this.ws.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'announcement.published' || event.type === 'announcement.updated') {
        void this.loadAnnouncementInbox(true);
      }

      if (!this.shouldNotify(event.type) || !this.shouldDisplayNotification(event)) {
        return;
      }

      const title = this.mapNotificationTitle(event);
      this.notification.info(title, event.message);
    });

    effect(() => {
      const profile = this.auth.profile();
      const onLoginPage = this.isLoginPage();

      if (profile && profile.role === 'user' && profile.mustChangePassword && !onLoginPage) {
        this.mustChangePasswordVisible.set(true);
      } else {
        this.mustChangePasswordVisible.set(false);
      }
      
      // 登录后才执行加载项目列表,只加载一次
      if (profile && !this.projectsLoaded()) {
        this.projectContext.loadProjects();
        this.projectsLoaded.set(true);
      }
    });

    effect(() => {
      const profile = this.auth.profile();
      if (!profile) {
        this.ws.disconnect();
        this.announcementItems.set([]);
        return;
      }

      this.ws.ensureConnected();
      void this.ws.refreshProjectSubscriptions();
      void this.loadAnnouncementInbox(true);
    });
  }

  protected openProfile(): void {
    void this.router.navigate(['/profile']);
  }

  protected async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    try {
      await this.auth.logout();
      this.projectContext.clear();
    } finally {
      this.loggingOut.set(false);
      await this.router.navigate(['/login']);
    }
  }

  protected async submitPasswordChange(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const value = this.passwordForm.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.changePasswordError.set('两次输入的新密码不一致');
      return;
    }

    this.changePasswordError.set(null);
    this.changingPassword.set(true);

    try {
      await this.auth.changePassword(value.oldPassword, value.newPassword);
      this.mustChangePasswordVisible.set(false);
      this.passwordForm.reset({ oldPassword: '', newPassword: '', confirmPassword: '' });
      this.notification.success('密码修改成功', '请使用新密码继续操作');
    } catch (error) {
      if (error instanceof HubApiError) {
        this.changePasswordError.set(error.message);
      } else if (error instanceof Error) {
        this.changePasswordError.set(error.message);
      } else {
        this.changePasswordError.set('修改密码失败');
      }
    } finally {
      this.changingPassword.set(false);
    }
  }

  protected onNotifyVisibleChange(open: boolean): void {
    if (open) {
      void this.loadAnnouncementInbox(false);
    }
  }

  protected async markAllAnnouncementsRead(): Promise<void> {
    if (!this.unreadAnnouncements().length) {
      return;
    }

    this.patchAllAnnouncementsRead();

    try {
      await firstValueFrom(
        this.api.post<{ count: number }, Record<string, never>>(
          '/api/admin/announcements/read-all',
          {},
        ),
      );
    } catch {
      void this.loadAnnouncementInbox(true);
    }
  }

  protected openAnnouncement(item: HeaderAnnouncementItem): void {
    void this.markAnnouncementRead(item);
    void this.router.navigate(['/announcements']);
  }

  protected openAnnouncementsCenter(): void {
    void this.router.navigate(['/announcements']);
  }

  protected formatAnnouncementTime(item: HeaderAnnouncementItem): string {
    return item.publishAt || item.createdAt;
  }

  private async loadAnnouncementInbox(silent = false): Promise<void> {
    if (!this.auth.profile()) {
      this.announcementItems.set([]);
      return;
    }

    if (!silent) {
      this.announcementLoading.set(true);
    }

    try {
      const result = await firstValueFrom(
        this.api.get<HeaderAnnouncementListResult>('/api/admin/announcements', {
          params: { page: 1, pageSize: 8, status: 'published' },
        }),
      );
      this.announcementItems.set(result.items);
    } catch {
      if (!silent) {
        this.announcementItems.set([]);
      }
    } finally {
      if (!silent) {
        this.announcementLoading.set(false);
      }
    }
  }

  private async markAnnouncementRead(item: HeaderAnnouncementItem): Promise<void> {
    if (item.isRead) {
      return;
    }

    this.patchAnnouncementRead(item.id, item.updatedAt);

    try {
      await firstValueFrom(
        this.api.post<HeaderAnnouncementItem, Record<string, never>>(
          `/api/admin/announcements/${item.id}/read`,
          {},
        ),
      );
    } catch {
      void this.loadAnnouncementInbox(true);
    }
  }

  private patchAnnouncementRead(announcementId: string, readVersion: string): void {
    this.announcementItems.update((items) =>
      items.map((item) =>
        item.id === announcementId
          ? {
              ...item,
              isRead: true,
              readAt: new Date().toISOString(),
              readVersion,
            }
          : item,
      ),
    );
  }

  private patchAllAnnouncementsRead(): void {
    const now = new Date().toISOString();
    this.announcementItems.update((items) =>
      items.map((item) => ({
        ...item,
        isRead: true,
        readAt: now,
        readVersion: item.updatedAt,
      })),
    );
  }

  private updateRouteState(): void {
    this.isLoginPage.set(this.router.url.startsWith('/login'));
  }

  private shouldNotify(type: HubWsEventType): boolean {
    return (
      type === 'announcement.published' ||
      type === 'announcement.updated' ||
      type === 'doc.published' ||
      type === 'release.created' ||
      type === 'broadcast' ||
      type === 'issue.updated'
    );
  }

  private shouldDisplayNotification(event: { type: HubWsEventType; payload: unknown }): boolean {
    if (event.type !== 'issue.updated') {
      return true;
    }

    const profile = this.auth.profile();
    const currentUserId = profile?.userId?.trim() || profile?.id || null;
    if (!currentUserId || typeof event.payload !== 'object' || event.payload === null) {
      return false;
    }

    const payload = event.payload as Record<string, unknown>;
    const actorId = typeof payload['actorId'] === 'string' ? payload['actorId'] : '';
    const action = typeof payload['action'] === 'string' ? payload['action'] : '';
    const assigneeId = typeof payload['assigneeId'] === 'string' ? payload['assigneeId'] : '';
    const mentionedUserIds = Array.isArray(payload['mentionedUserIds'])
      ? payload['mentionedUserIds'].filter((item): item is string => typeof item === 'string')
      : [];
    const changedUserIds = Array.isArray(payload['changedUserIds'])
      ? payload['changedUserIds'].filter((item): item is string => typeof item === 'string')
      : [];

    if (actorId && actorId === currentUserId) {
      return false;
    }

    if (action === 'comment_add') {
      return mentionedUserIds.includes(currentUserId);
    }
    if (action === 'add_participant') {
      return changedUserIds.includes(currentUserId);
    }
    if (action === 'assigned' || action === 'claimed' || action === 'reassigned') {
      return assigneeId === currentUserId || changedUserIds.includes(currentUserId);
    }

    return false;
  }

  private mapNotificationTitle(event: { type: HubWsEventType; payload: unknown }): string {
    if (
      event.type === 'issue.updated' &&
      typeof event.payload === 'object' &&
      event.payload !== null
    ) {
      const payload = event.payload as Record<string, unknown>;
      const action = typeof payload['action'] === 'string' ? payload['action'] : '';
      if (action === 'comment_add') {
        return '@ 评论提醒';
      }
      if (action === 'add_participant') {
        return '事项协作提醒';
      }
      if (action === 'assigned' || action === 'claimed' || action === 'reassigned') {
        return '事项指派提醒';
      }
    }

    switch (event.type) {
      case 'announcement.published':
      case 'announcement.updated':
        return '公告通知';
      case 'doc.published':
        return '文档发布';
      case 'release.created':
        return '版本发布';
      case 'broadcast':
        return '系统广播';
      default:
        return '系统通知';
    }
  }
}
