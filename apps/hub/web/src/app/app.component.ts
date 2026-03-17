import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { filter } from 'rxjs';
import { HubApiError } from './core/http/api-error.interceptor';
import { AdminAuthService } from './core/services/admin-auth.service';
import { HubWsEventType, HubWebsocketService } from './core/services/hub-websocket.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

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
    NzAlertModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class App {
  protected readonly title = signal('NGM Admin');
  protected readonly unreadCount = signal(3);
  protected readonly ws = inject(HubWebsocketService);
  protected readonly isLoginPage = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly auth = inject(AdminAuthService);

  protected readonly mustChangePasswordVisible = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly changePasswordError = signal<string | null>(null);

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

  protected readonly passwordForm = this.fb.nonNullable.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  public constructor() {
    this.updateRouteState();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.updateRouteState());

    this.ws.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      const title = this.mapNotificationTitle(event.type);
      this.notification.info(title, event.message);
      this.unreadCount.update((count) => count + 1);
    });

    effect(() => {
      const profile = this.auth.profile();
      const onLoginPage = this.isLoginPage();

      if (profile && profile.role === 'user' && profile.mustChangePassword && !onLoginPage) {
        this.mustChangePasswordVisible.set(true);
      } else {
        this.mustChangePasswordVisible.set(false);
      }
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

  private updateRouteState(): void {
    this.isLoginPage.set(this.router.url.startsWith('/login'));
  }

  private mapNotificationTitle(type: HubWsEventType): string {
    switch (type) {
      case 'feedback.created':
        return '新反馈通知';
      case 'announcement.created':
        return '新公告通知';
      case 'release.published':
        return '新版本发布';
      default:
        return '系统通知';
    }
  }
}

