import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthStore } from '@core/auth';
import { ProjectContextStore, type ProjectScopeMode } from '@core/state';
import { UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import { AvatarImageNormalizerService } from '@shared/services/avatar-image-normalizer.service';
import { SystemNotificationService } from '@shared/services/system-notification.service';
import { PageHeaderComponent } from '@shared/ui';
import { ProfileBasicFormComponent } from '../../components/profile-basic-form/profile-basic-form.component';
import { ProfileHeroComponent } from '../../components/profile-hero/profile-hero.component';
import {
  ProfileNotificationSettingsComponent,
  type ProfileNotificationSetting,
} from '../../components/profile-notification-settings/profile-notification-settings.component';
import { ProfilePasswordFormComponent } from '../../components/profile-password-form/profile-password-form.component';
import { ProfilePersonalTokenComponent } from '../../components/profile-personal-token/profile-personal-token.component';
import { ProfileProjectVisibilitySettingsComponent } from '../../components/profile-project-visibility-settings/profile-project-visibility-settings.component';
import { ProfileTabsComponent } from '../../components/profile-tabs/profile-tabs.component';
import type { ChangePasswordInput, ProfileNotificationPrefs, UpdateProfileInput } from '../../models/profile.model';
import { ProfileApiService } from '../../services/profile-api.service';

type ProfileTab = 'basic' | 'security' | 'notifications' | 'project-visibility' | 'tokens';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    NzAlertModule,
    PageHeaderComponent,
    ProfileHeroComponent,
    ProfileTabsComponent,
    ProfileBasicFormComponent,
    ProfilePasswordFormComponent,
    ProfileNotificationSettingsComponent,
    ProfileProjectVisibilitySettingsComponent,
    ProfilePersonalTokenComponent,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  readonly authStore = inject(AuthStore);
  private readonly profileApi = inject(ProfileApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly message = inject(NzMessageService);
  private readonly avatarUploadPolicy = UPLOAD_TARGETS.profileAvatar;
  private readonly avatarNormalizer = inject(AvatarImageNormalizerService);
  private readonly systemNotification = inject(SystemNotificationService);

  readonly activeTab = signal<ProfileTab>('basic');
  readonly busy = signal(false);
  readonly basicSaving = signal(false);
  readonly prefsSaving = signal(false);
  readonly prefsEditing = signal(false);
  readonly prefsDirty = signal(false);
  readonly projectScopeEditing = signal(false);
  readonly projectScopeSaving = signal(false);
  readonly projectScopeDirty = signal(false);
  readonly submittedVersion = signal(0);
  readonly basicSubmittedVersion = signal(0);
  readonly savedPrefs = signal<ProfileNotificationPrefs | null>(null);
  readonly projectScopeMode = signal<ProjectScopeMode>('member_only');
  readonly includeArchivedProjects = signal(false);
  readonly notificationPermissionDenied = signal(false);

  readonly showPermissionAlert = computed(() => this.notificationPermissionDenied());

  readonly tabs = [
    { id: 'basic', label: '基本信息', icon: 'user' },
    { id: 'security', label: '账号安全', icon: 'lock' },
    { id: 'notifications', label: '通知偏好', icon: 'bell' },
    { id: 'project-visibility', label: '项目显示范围', icon: 'appstore' },
    { id: 'tokens', label: 'API Token', icon: 'key' },
  ];

  readonly channelPrefs = signal<ProfileNotificationSetting[]>([
    { id: 'inbox', title: '站内消息', description: '通过站内通知中心接收提醒', enabled: true, icon: 'inbox' },
    {
      id: 'system_notification',
      title: '系统通知',
      description: '通过系统通知接收提醒（需浏览器支持并授权）',
      enabled: true,
      icon: 'bell',
    },
  ]);

  readonly eventPrefs = signal<ProfileNotificationSetting[]>([
    { id: 'issue_todo', title: '测试单待办', description: '测试单分配、加入协作或待验证时通知', enabled: true, icon: 'exclamation' },
    { id: 'issue_mentioned', title: '测试单评论@我', description: '评论中被 @ 时通知', enabled: true, icon: 'message' },
    { id: 'issue_activity', title: '测试单动态', description: '与你相关的测试单关键状态变化时通知', enabled: true, icon: 'reload' },
    { id: 'rd_todo', title: '研发项待办', description: '研发项分配到你或待你验收时通知', enabled: true, icon: 'flag' },
    { id: 'rd_activity', title: '研发项动态', description: '你参与的研发项进度变化时通知', enabled: true, icon: 'appstore' },
    { id: 'announcement_published', title: '公告发布', description: '项目或全局公告发布时通知', enabled: true, icon: 'notification' },
    { id: 'document_published', title: '文档发布', description: '项目文档发布时通知', enabled: true, icon: 'file-text' },
    { id: 'release_published', title: '版本发布', description: '项目版本发布时通知', enabled: true, icon: 'notification' },
    { id: 'project_member_changed', title: '项目成员变更', description: '你被加入、移出项目或角色变更时通知', enabled: true, icon: 'team' },
  ]);

  readonly initials = computed(() => {
    const user = this.authStore.currentUser();
    const source = user?.nickname || user?.username || 'U';
    return source.slice(0, 1).toUpperCase();
  });

  readonly displayName = computed(() => this.authStore.currentUser()?.nickname || this.authStore.currentUser()?.username || '当前账号');
  readonly email = computed(() => this.authStore.currentUser()?.email || '');
  readonly heroTags = computed(() => [
    this.authStore.currentUser()?.role === 'admin' ? 'Admin' : '项目成员',
    this.authStore.currentUser()?.role === 'admin' ? '系统管理员' : '协作成员'
  ]);

  readonly heroStats = computed(() => [
    { label: '已创建测试单', value: this.authStore.currentUser()?.role === 'admin' ? 128 : 36 },
    { label: '研发项', value: this.authStore.currentUser()?.role === 'admin' ? 36 : 12 },
    { label: '项目', value: this.authStore.currentUser()?.role === 'admin' ? 12 : 4 },
  ]);

  readonly securityMethods = computed(() => [
    { icon: 'appstore', title: 'Authenticator App', description: '使用 TOTP 应用生成一次性验证码', active: true },
    { icon: 'mail', title: '邮箱验证', description: '通过邮箱接收一次性验证码', active: false },
  ]);

  readonly sessions = computed(() => [
    { icon: 'desktop', name: 'macOS · Chrome 124', meta: '上海 · IP: 10.0.12.45 · 最后活跃：刚刚', current: true },
    { icon: 'mobile', name: 'iPhone · Safari', meta: '上海 · IP: 10.0.12.67 · 最后活跃：2 小时前', current: false },
    { icon: 'windows', name: 'Windows · Edge 123', meta: '北京 · IP: 10.0.23.89 · 最后活跃：3 天前', current: false },
  ]);

  constructor() {
    effect(() => {
      const user = this.authStore.currentUser();
      if (!user) return;
      this.loadNotificationPrefs();
    });

    effect(() => {
      const tab = this.activeTab();
      if (tab === 'notifications') {
        this.syncNotificationPermissionAlert();
      }
    });
  }

  changePassword(input: ChangePasswordInput): void {
    this.busy.set(true);
    this.profileApi.changePassword(input).subscribe({
      next: () => {
        this.busy.set(false);
        this.submittedVersion.update((version) => version + 1);
        this.message.success('密码修改成功');
      },
      error: () => {
        this.busy.set(false);
        this.message.error('密码修改失败，请检查当前密码后重试');
      },
    });
  }

  saveBasicProfile(input: UpdateProfileInput): void {
    this.basicSaving.set(true);
    this.profileApi.updateMyProfile(input).subscribe({
      next: (user) => {
        this.authStore.setCurrentUser(user);
        this.basicSaving.set(false);
        this.basicSubmittedVersion.update((value) => value + 1);
        this.message.success('基本信息已保存');
      },
      error: () => {
        this.basicSaving.set(false);
        this.message.error('基本信息保存失败');
      },
    });
  }

  togglePref(group: 'channel' | 'event', id: string, enabled: boolean): void {
    if (!this.prefsEditing() || this.prefsSaving()) {
      return;
    }
    const store = group === 'channel' ? this.channelPrefs : this.eventPrefs;
    store.update((items) => items.map((item) => (item.id === id ? { ...item, enabled } : item)));
    this.updatePrefsDirty();
  }

  startEditPrefs(): void {
    this.prefsEditing.set(true);
  }

  cancelEditPrefs(): void {
    const saved = this.savedPrefs();
    if (saved) {
      this.applyNotificationPrefs(saved);
    }
    this.prefsDirty.set(false);
    this.prefsEditing.set(false);
  }

  startEditProjectScope(): void {
    this.projectScopeEditing.set(true);
  }

  cancelEditProjectScope(): void {
    const saved = this.savedPrefs();
    if (saved) {
      this.projectScopeMode.set(saved.projectScopeMode ?? 'member_only');
      this.includeArchivedProjects.set(!!saved.includeArchivedProjects);
    }
    this.projectScopeDirty.set(false);
    this.projectScopeEditing.set(false);
  }

  changeProjectScopeMode(mode: ProjectScopeMode): void {
    if (!this.projectScopeEditing() || this.projectScopeSaving()) {
      return;
    }
    this.projectScopeMode.set(mode);
    this.updateProjectScopeDirty();
  }

  changeIncludeArchivedProjects(enabled: boolean): void {
    if (!this.projectScopeEditing() || this.projectScopeSaving()) {
      return;
    }
    this.includeArchivedProjects.set(enabled);
    this.updateProjectScopeDirty();
  }

  saveProjectScope(): void {
    if (!this.projectScopeEditing() || !this.projectScopeDirty() || this.projectScopeSaving()) {
      return;
    }
    this.projectScopeSaving.set(true);
    const saved = this.savedPrefs();
    const payload: ProfileNotificationPrefs = {
      channels: saved?.channels ?? Object.fromEntries(this.channelPrefs().map((item) => [item.id, item.enabled])),
      events: saved?.events ?? Object.fromEntries(this.eventPrefs().map((item) => [item.id, item.enabled])),
      projectScopeMode: this.projectScopeMode(),
      includeArchivedProjects: this.includeArchivedProjects(),
      updatedAt: new Date().toISOString(),
    };
    this.profileApi.saveNotificationPrefs(payload).subscribe({
      next: (saved) => {
        this.projectScopeSaving.set(false);
        this.savedPrefs.set(saved);
        this.applyNotificationPrefs(saved);
        this.projectScopeMode.set(saved.projectScopeMode ?? 'member_only');
        this.includeArchivedProjects.set(!!saved.includeArchivedProjects);
        this.projectScopeDirty.set(false);
        this.projectScopeEditing.set(false);
        this.projectContext.setProjectScopeMode(saved.projectScopeMode ?? 'member_only');
        this.projectContext.refreshIncludeArchivedProjects(!!saved.includeArchivedProjects).subscribe();
        this.message.success('项目显示范围已保存');
      },
      error: () => {
        this.projectScopeSaving.set(false);
        this.message.error('项目显示范围保存失败');
      },
    });
  }

  saveNotificationPrefs(): void {
    if (!this.prefsEditing() || !this.prefsDirty() || this.prefsSaving()) {
      return;
    }
    this.prefsSaving.set(true);
    const payload = this.currentPrefsPayload(this.savedPrefs()?.projectScopeMode ?? this.projectScopeMode());
    this.profileApi.saveNotificationPrefs(payload).subscribe({
      next: async (saved) => {
        this.prefsSaving.set(false);
        this.savedPrefs.set(saved);
        this.applyNotificationPrefs(saved);
        this.prefsDirty.set(false);
        this.prefsEditing.set(false);

        const systemNotificationEnabled = saved.channels['system_notification'];
        if (systemNotificationEnabled) {
          const result = await this.systemNotification.checkAndPromptPermission();
          this.notificationPermissionDenied.set(result === 'denied');
        } else {
          this.notificationPermissionDenied.set(false);
        }

        this.message.success('通知偏好已保存');
      },
      error: () => {
        this.prefsSaving.set(false);
        this.message.error('通知偏好保存失败');
      },
    });
  }

  async updateAvatar(file: File): Promise<void> {
    const validationMessage = validateUploadFile(file, this.avatarUploadPolicy);
    if (validationMessage) {
      this.message.warning(validationMessage);
      return;
    }

    let normalizedFile: File;
    try {
      normalizedFile = await this.avatarNormalizer.normalize(file);
    } catch (error) {
      this.message.error(error instanceof Error ? error.message : '头像处理失败');
      return;
    }

    this.busy.set(true);
    this.profileApi.uploadAvatar(normalizedFile).subscribe({
      next: (upload) => {
        this.profileApi.updateMyAvatar(upload.id).subscribe({
          next: (user) => {
            this.authStore.setCurrentUser(user);
            this.busy.set(false);
            this.message.success('头像已更新');
          },
          error: () => {
            this.busy.set(false);
            this.message.error('头像更新失败');
          },
        });
      },
      error: () => {
        this.busy.set(false);
        this.message.error('头像上传失败');
      },
    });
  }

  private loadNotificationPrefs(): void {
    this.profileApi.loadNotificationPrefs().subscribe({
      next: (prefs) => {
        this.savedPrefs.set(prefs);
        this.applyNotificationPrefs(prefs);
        this.syncNotificationPermissionAlert();
        this.prefsDirty.set(false);
        this.prefsEditing.set(false);
        this.projectScopeDirty.set(false);
        this.projectScopeEditing.set(false);
      },
      error: () => {
        // keep defaults
      },
    });
  }

  private currentPrefsPayload(projectScopeMode: ProjectScopeMode): ProfileNotificationPrefs {
    return {
      channels: Object.fromEntries(this.channelPrefs().map((item) => [item.id, item.enabled])),
      events: Object.fromEntries(this.eventPrefs().map((item) => [item.id, item.enabled])),
      projectScopeMode,
      includeArchivedProjects: this.includeArchivedProjects(),
      updatedAt: new Date().toISOString(),
    };
  }

  private applyNotificationPrefs(prefs: ProfileNotificationPrefs): void {
    this.channelPrefs.update((items) => items.map((item) => ({ ...item, enabled: prefs.channels[item.id] ?? item.enabled })));
    this.eventPrefs.update((items) => items.map((item) => ({ ...item, enabled: prefs.events[item.id] ?? item.enabled })));
    this.projectScopeMode.set(prefs.projectScopeMode ?? 'member_only');
    this.includeArchivedProjects.set(!!prefs.includeArchivedProjects);
  }

  private updatePrefsDirty(): void {
    const saved = this.savedPrefs();
    if (!saved) {
      this.prefsDirty.set(true);
      return;
    }
    const current = this.currentPrefsPayload(saved.projectScopeMode ?? this.projectScopeMode());
    const sameChannels = JSON.stringify(current.channels) === JSON.stringify(saved.channels);
    const sameEvents = JSON.stringify(current.events) === JSON.stringify(saved.events);
    this.prefsDirty.set(!(sameChannels && sameEvents));
  }

  private updateProjectScopeDirty(): void {
    const saved = this.savedPrefs();
    const sameScope = (saved?.projectScopeMode ?? 'member_only') === this.projectScopeMode();
    const sameArchivedFlag = !!saved?.includeArchivedProjects === this.includeArchivedProjects();
    this.projectScopeDirty.set(!(sameScope && sameArchivedFlag));
  }

  private syncNotificationPermissionAlert(): void {
    const enabled = this.channelPrefs().find((item) => item.id === 'system_notification')?.enabled ?? false;
    const permissionDenied = enabled && this.systemNotification.getPermission() === 'denied';
    this.notificationPermissionDenied.set(permissionDenied);
  }
}
