import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { AdminAuthService } from '../../core/services/admin-auth.service';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzIconModule,
    NzInputModule
  ],
  template: `
    <section class="login-page">
      <div class="noise-layer" aria-hidden="true"></div>

      <div class="login-card">
        <h1 class="brand">ngm-admin</h1>
        <p class="subtitle">欢迎登录</p>

        @if (errorMessage()) {
          <nz-alert nzType="error" [nzMessage]="errorMessage()!" nzShowIcon></nz-alert>
        }

        <form nz-form [formGroup]="form" nzLayout="vertical" class="form">
          <nz-form-item>
            <nz-form-label nzRequired>用户名</nz-form-label>
            <nz-form-control nzErrorTip="请输入用户名">
              <input nz-input formControlName="username" placeholder="请输入您的用户名" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>密码</nz-form-label>
            <nz-form-control nzErrorTip="请输入密码">
              <nz-input-wrapper>
                <input
                  nz-input
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="请输入您的密码"
                />
                <span nzInputSuffix nz-icon [nzType]="showPassword() ? 'eye-invisible' : 'eye'" (click)="togglePassword()"></span>
              </nz-input-wrapper>
            </nz-form-control>
          </nz-form-item>

          <button nz-button nzType="primary" nzBlock (click)="submit()" [disabled]="loading() || form.invalid">
            立即登录
          </button>
        </form>

        <div class="footer-links">
          <a>忘记密码?</a>
          <a>注册账号</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .login-page {
      min-height: 100vh;
      background: radial-gradient(circle at 20% 20%, #eef4ff 0, #f3f5f8 35%, #f6f7f9 100%);
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      padding: 24px;
    }

    .noise-layer {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(60, 130, 255, 0.12) 2px, transparent 2px);
      background-size: 220px 220px;
      background-position: 40px 60px;
      opacity: 0.35;
      pointer-events: none;
    }

    .login-card {
      width: min(450px, calc(100vw - 40px));
      background: rgba(255, 255, 255, 0.96);
      border-radius: 18px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
      padding: 34px 32px 26px;
      display: grid;
      gap: 14px;
      z-index: 1;
      backdrop-filter: blur(2px);
    }

    .brand {
      margin: 0;
      text-align: center;
      font-size: 48px;
      font-weight: 700;
      letter-spacing: -1px;
      background: linear-gradient(90deg, #2f67ff, #0ea5d7);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-family: 'Segoe UI', 'PingFang SC', sans-serif;
    }

    .subtitle {
      margin: 0;
      text-align: center;
      color: #6b7280;
      font-size: 26px;
    }

    .form {
      display: grid;
      gap: 4px;
      margin-top: 4px;
    }

    .footer-links {
      margin-top: 6px;
      display: flex;
      justify-content: center;
      gap: 20px;
      color: #8b95a6;
      font-size: 13px;

      a {
        color: inherit;
      }
    }

    [nz-icon] {
      cursor: pointer;
      color: #9ca3af;
    }

    @media (max-width: 640px) {
      .login-card {
        padding: 26px 20px 20px;
      }

      .brand {
        font-size: 40px;
      }

      .subtitle {
        font-size: 22px;
      }
    }
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const value = this.form.getRawValue();
      await this.auth.login(value.username.trim(), value.password);

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      if (error instanceof HubApiError) {
        this.errorMessage.set(error.message);
      } else if (error instanceof Error) {
        this.errorMessage.set(error.message);
      } else {
        this.errorMessage.set('登录失败，请稍后重试');
      }
    } finally {
      this.loading.set(false);
    }
  }
}