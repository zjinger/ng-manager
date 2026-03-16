import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HubTimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import type { DashboardAnnouncementItem } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard-announcement-panel',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule, HubTimeAgoPipe],
  template: `
    <nz-card class="info-card">
      <div class="panel-head">
        <div class="panel-title">未读公告</div>
        <button type="button" class="panel-link" (click)="openRoute('/announcements')">全部公告</button>
      </div>
      <div class="panel-subtitle">当前先按最新已发布公告展示</div>

      @if (items.length) {
        <div class="panel-list">
          @for (item of items; track item.id) {
            <button type="button" class="info-item" (click)="open(item)">
              <div class="info-item__badge">{{ item.badgeText }}</div>
              <div class="info-item__title">{{ item.title }}</div>
              <div class="info-item__summary">{{ item.summary }}</div>
              <div class="info-item__time">{{ item.publishAt | hubTimeAgo }}</div>
            </button>
          }
        </div>
      } @else {
        <div class="panel-empty">
          <span nz-icon nzType="notification"></span>
          暂无公告
        </div>
      }
    </nz-card>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }

      .info-card {
        height: 100%;
        border: 0;
        border-radius: 20px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .panel-title {
        color: #0f172a;
        font-size: 20px;
        font-weight: 700;
      }

      .panel-link {
        border: 0;
        background: transparent;
        color: #2563eb;
        font-weight: 600;
        cursor: pointer;
      }

      .panel-subtitle {
        margin-top: 8px;
        color: #64748b;
        font-size: 13px;
      }

      .panel-list {
        margin-top: 16px;
        display: grid;
      }

      .info-item {
        width: 100%;
        border: 0;
        padding: 14px 0;
        text-align: left;
        background: transparent;
        cursor: pointer;
        border-top: 1px solid #e2e8f0;
      }

      .info-item:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .info-item__badge {
        width: fit-content;
        padding: 3px 10px;
        border-radius: 999px;
        background: #eff6ff;
        color: #2563eb;
        font-size: 12px;
        font-weight: 700;
      }

      .info-item__title {
        margin-top: 10px;
        color: #0f172a;
        font-size: 15px;
        font-weight: 600;
        line-height: 1.5;
      }

      .info-item__summary {
        margin-top: 6px;
        color: #64748b;
        font-size: 13px;
        line-height: 1.6;
      }

      .info-item__time {
        margin-top: 10px;
        color: #94a3b8;
        font-size: 12px;
      }

      .panel-empty {
        min-height: 180px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #64748b;
      }
    `
  ]
})
export class DashboardAnnouncementPanelComponent {
  @Input() items: DashboardAnnouncementItem[] = [];

  private readonly router = inject(Router);

  protected open(item: DashboardAnnouncementItem): void {
    if (!item.route) {
      return;
    }

    void this.router.navigate([item.route], { queryParams: item.queryParams });
  }

  protected openRoute(route: string): void {
    void this.router.navigate([route]);
  }
}
