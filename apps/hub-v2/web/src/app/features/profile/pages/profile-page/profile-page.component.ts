import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthStore } from '../../../../core/auth/auth.store';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { ProfileActivityLogComponent, type ProfileActivityItem } from '../../components/profile-activity-log/profile-activity-log.component';
import { ProfileBasicFormComponent } from '../../components/profile-basic-form/profile-basic-form.component';
import { ProfileHeroComponent } from '../../components/profile-hero/profile-hero.component';
import {
  ProfileNotificationSettingsComponent,
  type ProfileNotificationSetting,
} from '../../components/profile-notification-settings/profile-notification-settings.component';
import { ProfilePasswordFormComponent } from '../../components/profile-password-form/profile-password-form.component';
import { ProfileSecurityOverviewComponent } from '../../components/profile-security-overview/profile-security-overview.component';
import { ProfileTabsComponent } from '../../components/profile-tabs/profile-tabs.component';
import type { ChangePasswordInput } from '../../models/profile.model';
import { ProfileApiService } from '../../services/profile-api.service';

type ProfileTab = 'basic' | 'security' | 'notifications' | 'activity';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ProfileHeroComponent,
    ProfileTabsComponent,
    ProfileBasicFormComponent,
    ProfilePasswordFormComponent,
    ProfileSecurityOverviewComponent,
    ProfileNotificationSettingsComponent,
    ProfileActivityLogComponent,
  ],
  template: `
    <app-page-header title="个人中心" subtitle="管理你的个人信息、安全设置与偏好" />

    <app-profile-hero
      [initials]="initials()"
      [name]="displayName()"
      [subtitle]="email()"
      [tags]="heroTags()"
      [stats]="heroStats()"
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

          <app-profile-security-overview [methods]="securityMethods()" [sessions]="sessions()" />
        </section>
      }

      @case ('notifications') {
        <app-profile-notification-settings
          [channels]="channelPrefs()"
          [events]="eventPrefs()"
          (toggle)="togglePref($event.group, $event.id, $event.enabled)"
        />
      }

      @case ('activity') {
        <app-profile-activity-log [items]="activityItems()" />
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

  readonly activeTab = signal<ProfileTab>('basic');
  readonly busy = signal(false);
  readonly submittedVersion = signal(0);

  readonly tabs = [
    { id: 'basic', label: '基本信息' },
    { id: 'security', label: '账号安全' },
    { id: 'notifications', label: '通知偏好' },
    { id: 'activity', label: '操作日志' },
  ];

  readonly channelPrefs = signal<ProfileNotificationSetting[]>([
    { id: 'mail', title: '邮件通知', description: '当前账号邮箱接收重要事件提醒', enabled: true, icon: '✉' },
    { id: 'inbox', title: '站内消息', description: '浏览器内实时推送，适合日常协作提醒', enabled: true, icon: '◉' },
    { id: 'bot', title: '飞书机器人', description: '未绑定 · 后续可接入群机器人提醒', enabled: false, icon: '⌘' },
  ]);

  readonly eventPrefs = signal<ProfileNotificationSetting[]>([
    { id: 'issue-assigned', title: 'Issue 分配给我', description: '当 Issue 被分配到你时通知', enabled: true, icon: '!' },
    { id: 'issue-updated', title: 'Issue 状态变更', description: '你参与的 Issue 状态变化时通知', enabled: true, icon: '↻' },
    { id: 'rd-comment', title: '研发项评论', description: '你的研发项收到评论时通知', enabled: true, icon: '✎' },
    { id: 'release', title: '发布通知', description: '有新的版本发布时通知', enabled: false, icon: '↑' },
    { id: 'config', title: '配置变更', description: '你管理的共享配置被修改时通知', enabled: true, icon: '⚙' },
  ]);

  readonly initials = computed(() => {
    const user = this.authStore.currentUser();
    const source = user?.nickname || user?.username || 'U';
    return source.slice(0, 1).toUpperCase();
  });

  readonly displayName = computed(() => this.authStore.currentUser()?.nickname || this.authStore.currentUser()?.username || '当前账号');
  readonly email = computed(() => `${this.authStore.currentUser()?.username || 'user'}@example.com`);
  readonly heroTags = computed(() => [
    this.authStore.currentUser()?.role === 'admin' ? 'Admin' : 'Member',
    this.authStore.currentUser()?.role === 'admin' ? '系统管理员' : '协作成员',
    'ng-manager',
  ]);

  readonly heroStats = computed(() => [
    { label: '已创建 Issue', value: this.authStore.currentUser()?.role === 'admin' ? 128 : 36 },
    { label: '研发项', value: this.authStore.currentUser()?.role === 'admin' ? 36 : 12 },
    { label: '项目', value: this.authStore.currentUser()?.role === 'admin' ? 12 : 4 },
  ]);

  readonly securityMethods = computed(() => [
    { icon: '⟡', title: 'Authenticator App', description: '使用 TOTP 应用生成一次性验证码', active: true },
    { icon: '✉', title: '邮箱验证', description: '通过邮箱接收一次性验证码', active: false },
  ]);

  readonly sessions = computed(() => [
    { icon: '⌘', name: 'macOS · Chrome 124', meta: '上海 · IP: 10.0.12.45 · 最后活跃：刚刚', current: true },
    { icon: '☏', name: 'iPhone · Safari', meta: '上海 · IP: 10.0.12.67 · 最后活跃：2 小时前', current: false },
    { icon: '⊞', name: 'Windows · Edge 123', meta: '北京 · IP: 10.0.23.89 · 最后活跃：3 天前', current: false },
  ]);

  readonly activityItems = computed<ProfileActivityItem[]>(() => [
    {
      id: 'profile-activity-1',
      dotColor: 'var(--primary-500)',
      html: '<strong>创建了 Issue</strong> <a href="#">ISS-2048 · 支持批量导入用户</a>',
      meta: '今天 10:32 · ng-manager · Issues',
    },
    {
      id: 'profile-activity-2',
      dotColor: 'var(--success)',
      html: '<strong>更新了研发项状态</strong> <a href="#">RD-108 · Dashboard 性能优化</a> 从进行中变更为已完成',
      meta: '今天 09:15 · ng-manager · 研发项',
    },
    {
      id: 'profile-activity-3',
      dotColor: 'var(--info)',
      html: '<strong>修改了共享配置</strong> <a href="#">api.base_url</a> 的值',
      meta: '昨天 17:42 · ng-manager · 共享配置',
    },
    {
      id: 'profile-activity-4',
      dotColor: 'var(--warning)',
      html: '<strong>发布了文档</strong> <a href="#">前端工程化最佳实践 v2.1</a>',
      meta: '昨天 15:20 · ng-manager · 内容管理',
    },
  ]);

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
  }
}
