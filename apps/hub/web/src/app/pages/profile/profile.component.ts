import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';

interface AccountProfile {
  id: string;
  userId?: string | null;
  username: string;
  displayName: string;
  email?: string | null;
  mobile?: string | null;
  bio?: string | null;
  role: 'admin' | 'user';
  roleLabel: string;
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    NzAlertModule,
    NzAvatarModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzTabsModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.less'],
  styles: [PAGE_SHELL_STYLES]
})
export class ProfilePageComponent {
  @ViewChild('avatarInput') private readonly avatarInput?: ElementRef<HTMLInputElement>;

  protected readonly loading = signal(false);
  protected readonly savingBasic = signal(false);
  protected readonly uploadingAvatar = signal(false);
  protected readonly resettingAvatar = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly profile = signal<AccountProfile | null>(null);

  protected readonly avatarUrl = computed(() => {
    const profile = this.profile();
    if (!profile?.avatarUrl) {
      return null;
    }
    const separator = profile.avatarUrl.includes('?') ? '&' : '?';
    return `${profile.avatarUrl}${separator}v=${encodeURIComponent(profile.updatedAt)}`;
  });

  protected readonly avatarText = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return 'NA';
    }
    const source = (profile.displayName || profile.username).trim();
    return (source.slice(0, 1) || 'N').toUpperCase();
  });

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly notification = inject(NzNotificationService);
  private readonly router = inject(Router);

  protected readonly basicForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    mobile: ['', [Validators.maxLength(40)]],
    bio: ['', [Validators.maxLength(500)]]
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  public constructor() {
    void this.loadProfile();
  }

  protected async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const profile = await firstValueFrom(this.api.get<AccountProfile>('/api/admin/auth/profile'));
      this.profile.set(profile);
      this.resetBasicForm();
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载个人资料失败'));
    } finally {
      this.loading.set(false);
    }
  }

  protected resetBasicForm(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    this.basicForm.reset({
      displayName: profile.displayName || '',
      email: profile.email || '',
      mobile: profile.mobile || '',
      bio: profile.bio || ''
    });
  }

  protected openAvatarPicker(): void {
    this.avatarInput?.nativeElement.click();
  }

  protected async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file, file.name);

    this.uploadingAvatar.set(true);
    try {
      const profile = await firstValueFrom(this.api.post<AccountProfile, FormData>('/api/admin/auth/avatar', formData));
      this.profile.set(profile);
      await this.auth.refreshProfile();
      this.notification.success('头像已更新', '新的头像已保存');
    } catch (error) {
      this.notification.error('头像更新失败', this.resolveErrorMessage(error, '头像更新失败'));
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  protected async resetAvatar(): Promise<void> {
    this.resettingAvatar.set(true);
    try {
      const profile = await firstValueFrom(this.api.delete<AccountProfile>('/api/admin/auth/avatar'));
      this.profile.set(profile);
      await this.auth.refreshProfile();
      this.notification.success('头像已恢复', '已恢复为默认头像');
    } catch (error) {
      this.notification.error('恢复默认头像失败', this.resolveErrorMessage(error, '恢复默认头像失败'));
    } finally {
      this.resettingAvatar.set(false);
    }
  }

  protected async saveBasicProfile(): Promise<void> {
    if (this.basicForm.invalid) {
      this.basicForm.markAllAsTouched();
      return;
    }

    this.savingBasic.set(true);
    try {
      const payload = this.basicForm.getRawValue();
      const profile = await firstValueFrom(
        this.api.patch<AccountProfile, typeof payload>('/api/admin/auth/profile', payload)
      );
      this.profile.set(profile);
      this.resetBasicForm();
      await this.auth.refreshProfile();
      this.notification.success('资料已保存', '个人资料更新成功');
    } catch (error) {
      this.notification.error('保存失败', this.resolveErrorMessage(error, '保存资料失败'));
    } finally {
      this.savingBasic.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const value = this.passwordForm.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.notification.warning('两次输入不一致', '请确认新密码和确认密码一致');
      return;
    }

    this.changingPassword.set(true);
    try {
      await this.auth.changePassword(value.oldPassword, value.newPassword);
      this.passwordForm.reset({ oldPassword: '', newPassword: '', confirmPassword: '' });
      this.notification.success('密码已修改', '下次登录请使用新密码');
    } catch (error) {
      this.notification.error('修改密码失败', this.resolveErrorMessage(error, '修改密码失败'));
    } finally {
      this.changingPassword.set(false);
    }
  }

  protected goBack(): void {
    void this.router.navigate(['/dashboard']);
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) {
      return error.message;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }
}

