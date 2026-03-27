import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthStore } from '@core/auth';
import { PageHeaderComponent } from '@shared/ui';
import { ProfileBasicFormComponent } from '../../components/profile-basic-form/profile-basic-form.component';
import { ProfileHeroComponent } from '../../components/profile-hero/profile-hero.component';
import {
  ProfileNotificationSettingsComponent,
  type ProfileNotificationSetting,
} from '../../components/profile-notification-settings/profile-notification-settings.component';
import { ProfilePasswordFormComponent } from '../../components/profile-password-form/profile-password-form.component';
import { ProfilePersonalTokenComponent } from '../../components/profile-personal-token/profile-personal-token.component';
import { ProfileTabsComponent } from '../../components/profile-tabs/profile-tabs.component';
import type { ChangePasswordInput, ProfileNotificationPrefs } from '../../models/profile.model';
import { ProfileApiService } from '../../services/profile-api.service';

type ProfileTab = 'basic' | 'security' | 'notifications' | 'tokens';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ProfileHeroComponent,
    ProfileTabsComponent,
    ProfileBasicFormComponent,
    ProfilePasswordFormComponent,
    ProfileNotificationSettingsComponent,
    ProfilePersonalTokenComponent,
  ],
  template: `
    <app-page-header title="个人中心" subtitle="管理你的个人信息、安全设置与偏好" />

    <app-profile-hero
      [initials]="initials()"
      [name]="displayName()"
      [subtitle]="email()"
      [avatarUrl]="authStore.currentUser()?.avatarUrl ?? null"
      [tags]="heroTags()"
      [stats]="heroStats()"
      (avatarChange)="updateAvatar($event)"
    />

    <app-profile-tabs [tabs]="tabs" [activeId]="activeTab()" (tabChange)="activeTab.set($any($event))" />

    @switch (activeTab()) {
      @case ('basic') {
        <app-profile-basic-form [user]="authStore.currentUser()" />
      }

      @case ('security') {
        <section class="profile-stack">
          <app-profile-password-form
            [busy]="busy()"
            [submitted]="submittedVersion() > 0"
            (changePassword)="changePassword($event)"
          />

          <!-- <app-profile-security-overview [methods]="securityMethods()" [sessions]="sessions()" /> -->
        </section>
      }

      @case ('notifications') {
        <app-profile-notification-settings
          [channels]="channelPrefs()"
          [events]="eventPrefs()"
          (toggle)="togglePref($event.group, $event.id, $event.enabled)"
        />
      }

      @case ('tokens') {
        <app-profile-personal-token />
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      app-profile-hero {
        display: block;
        margin-bottom: 24px;
      }

      .profile-stack {
        display: grid;
        gap: 20px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  readonly authStore = inject(AuthStore);
  private readonly profileApi = inject(ProfileApiService);
  private readonly message = inject(NzMessageService);

  readonly activeTab = signal<ProfileTab>('basic');
  readonly busy = signal(false);
  readonly submittedVersion = signal(0);

  readonly tabs = [
    { id: 'basic', label: '基本信息', icon: 'user' },
    { id: 'security', label: '账号安全', icon: 'lock' },
    { id: 'notifications', label: '通知偏好', icon: 'bell' },
    { id: 'tokens', label: 'API Token', icon: 'key' },
  ];

  readonly channelPrefs = signal<ProfileNotificationSetting[]>([
    { id: 'inbox', title: '站内消息', description: '通过站内通知中心接收提醒', enabled: true, icon: 'inbox' },
  ]);

  readonly eventPrefs = signal<ProfileNotificationSetting[]>([
    { id: 'issue_assigned', title: '测试单指派给我', description: '测试单成为你的待办时通知', enabled: true, icon: 'exclamation' },
    { id: 'issue_participant', title: '测试单加入协作', description: '被添加为协作人时通知', enabled: true, icon: 'plus' },
    { id: 'issue_status_changed', title: '测试单状态变化', description: '你提报/负责/协作的测试单状态变化时通知', enabled: true, icon: 'reload' },
    { id: 'issue_commented', title: '测试单评论与@提及', description: '测试单收到新评论或被 @ 时通知', enabled: true, icon: 'edit' },
    { id: 'rd_assigned', title: '研发项指派给我', description: '研发项分配到你时通知', enabled: true, icon: 'flag' },
    { id: 'rd_status_changed', title: '研发项状态变化', description: '你参与的研发项进度或状态变化时通知', enabled: true, icon: 'appstore' },
    { id: 'rd_commented', title: '研发项评论与@提及', description: '研发项收到新评论或被 @ 时通知', enabled: true, icon: 'edit' },
    { id: 'announcement_published', title: '公告发布', description: '项目或全局公告发布时通知', enabled: true, icon: 'notification' },
    { id: 'release_published', title: '版本发布', description: '项目版本发布时通知', enabled: true, icon: 'notification' },
    { id: 'project_member_changed', title: '项目成员变更', description: '你所在项目成员变更时通知', enabled: false, icon: 'team' },
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
    { label: '已创建 Issue', value: this.authStore.currentUser()?.role === 'admin' ? 128 : 36 },
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
  }

  changePassword(input: ChangePasswordInput): void {
    this.busy.set(true);
    this.profileApi.changePassword(input).subscribe({
      next: () => {
        this.busy.set(false);
        this.submittedVersion.update((version) => version + 1);
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  togglePref(group: 'channel' | 'event', id: string, enabled: boolean): void {
    const store = group === 'channel' ? this.channelPrefs : this.eventPrefs;
    store.update((items) => items.map((item) => (item.id === id ? { ...item, enabled } : item)));
    this.persistNotificationPrefs();
  }

  updateAvatar(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.message.warning('仅支持图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.message.warning('头像图片不能超过 10MB');
      return;
    }
    this.busy.set(true);
    this.profileApi.uploadAvatar(file).subscribe({
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
      next: (prefs) => this.applyNotificationPrefs(prefs),
      error: () => {
        // keep defaults
      },
    });
  }

  private persistNotificationPrefs(): void {
    const payload: ProfileNotificationPrefs = {
      channels: Object.fromEntries(this.channelPrefs().map((item) => [item.id, item.enabled])),
      events: Object.fromEntries(this.eventPrefs().map((item) => [item.id, item.enabled])),
      updatedAt: new Date().toISOString(),
    };
    this.profileApi.saveNotificationPrefs(payload).subscribe({
      next: (saved) => this.applyNotificationPrefs(saved),
      error: () => {
        this.message.error('通知偏好保存失败');
      },
    });
  }

  private applyNotificationPrefs(prefs: ProfileNotificationPrefs): void {
    this.channelPrefs.update((items) => items.map((item) => ({ ...item, enabled: prefs.channels[item.id] ?? item.enabled })));
    this.eventPrefs.update((items) => items.map((item) => ({ ...item, enabled: prefs.events[item.id] ?? item.enabled })));
  }
}
