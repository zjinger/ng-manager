import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { DashboardHeroData } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard-hero',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
  template: `
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-eyebrow">{{ greeting() }}</div>
        <h1 class="hero-title">{{ data.displayName }}</h1>
        <div class="hero-role">
          <span nz-icon nzType="safety-certificate"></span>
          {{ data.roleLabel }}
        </div>
        <p class="hero-summary">{{ data.summary }}</p>
      </div>

      <div class="hero-side">
        <div class="hero-time-block">
          <div class="hero-time-label">当前时间</div>
          <div class="hero-time-value">{{ now() | date: 'yyyy-MM-dd HH:mm' }}</div>
        </div>

        <div class="hero-time-block">
          <div class="hero-time-label">最近登录</div>
          <div class="hero-time-value">
            {{ data.lastLoginAt ? (data.lastLoginAt | date: 'yyyy-MM-dd HH:mm') : '首次登录' }}
          </div>
        </div>

        <div class="hero-actions">
          <button nz-button nzType="default" (click)="profileClick.emit()">
            <span nz-icon nzType="user"></span>
            个人资料
          </button>
          <button nz-button nzType="primary" (click)="changePasswordClick.emit()">
            <span nz-icon nzType="lock"></span>
            修改密码
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .hero-card {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
        gap: 20px;
        padding: 28px;
        border-radius: 24px;
        color: #eff6ff;
        background:
          radial-gradient(circle at top right, rgba(125, 211, 252, 0.28), transparent 26%),
          linear-gradient(135deg, #0f172a 0%, #172554 45%, #1d4ed8 100%);
        box-shadow: 0 22px 48px rgba(15, 23, 42, 0.18);
      }

      .hero-main {
        min-width: 0;
      }

      .hero-eyebrow {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(224, 231, 255, 0.88);
      }

      .hero-title {
        margin: 12px 0 0;
        font-size: 40px;
        line-height: 1.05;
        font-weight: 700;
        letter-spacing: -0.04em;
        color: #fff;
      }

      .hero-role {
        margin-top: 14px;
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        color: #dbeafe;
        background: rgba(15, 23, 42, 0.2);
      }

      .hero-summary {
        margin: 18px 0 0;
        max-width: 720px;
        color: rgba(239, 246, 255, 0.9);
        font-size: 16px;
        line-height: 1.7;
      }

      .hero-side {
        display: grid;
        gap: 16px;
        align-content: start;
      }

      .hero-time-block {
        padding: 16px 18px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.18);
        border: 1px solid rgba(191, 219, 254, 0.14);
      }

      .hero-time-label {
        color: rgba(191, 219, 254, 0.82);
        font-size: 13px;
      }

      .hero-time-value {
        margin-top: 8px;
        color: #fff;
        font-size: 18px;
        font-weight: 600;
      }

      .hero-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      @media (max-width: 1100px) {
        .hero-card {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .hero-card {
          padding: 20px;
        }

        .hero-title {
          font-size: 30px;
        }

        .hero-summary {
          font-size: 14px;
        }

        .hero-actions {
          display: grid;
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class DashboardHeroComponent {
  @Input({ required: true }) data!: DashboardHeroData;

  @Output() readonly profileClick = new EventEmitter<void>();
  @Output() readonly changePasswordClick = new EventEmitter<void>();

  protected readonly now = signal(new Date());
  protected readonly greeting = signal(this.resolveGreeting(new Date()));

  private readonly destroyRef = inject(DestroyRef);

  public constructor() {
    const timer = window.setInterval(() => {
      const current = new Date();
      this.now.set(current);
      this.greeting.set(this.resolveGreeting(current));
    }, 60000);

    this.destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  private resolveGreeting(now: Date): string {
    const hour = now.getHours();
    if (hour < 6) return '凌晨好';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  }
}
