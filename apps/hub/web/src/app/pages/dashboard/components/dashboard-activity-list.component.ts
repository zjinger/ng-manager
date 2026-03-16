import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HubTimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import type { DashboardActivityItem } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard-activity-list',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule, HubTimeAgoPipe],
  template: `
    <nz-card class="panel-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">我的最近动态</div>
          <div class="panel-subtitle">最近参与过的事项、文档和问题变更</div>
        </div>
      </div>

      @if (items.length) {
        <div class="activity-list">
          @for (item of items; track item.id) {
            <button type="button" class="activity-item" (click)="open(item)">
              <div class="activity-item__icon" [attr.data-tone]="item.tone">
                <span nz-icon [nzType]="item.icon"></span>
              </div>

              <div class="activity-item__content">
                <div class="activity-item__title">{{ item.title }}</div>
                <div class="activity-item__detail">{{ item.detail }}</div>
              </div>

              <div class="activity-item__time">{{ item.occurredAt | hubTimeAgo }}</div>
            </button>
          }
        </div>
      } @else {
        <div class="panel-empty">
          <span nz-icon nzType="clock-circle"></span>
          暂无最近动态
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

      .panel-card {
        height: 100%;
        border: 0;
        border-radius: 20px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }

      .panel-head {
        padding: 6px 2px 18px;
      }

      .panel-title {
        color: #0f172a;
        font-size: 24px;
        font-weight: 700;
      }

      .panel-subtitle {
        margin-top: 6px;
        color: #64748b;
        font-size: 14px;
      }

      .activity-list {
        display: grid;
      }

      .activity-item {
        width: 100%;
        border: 0;
        padding: 16px 0;
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto;
        gap: 14px;
        align-items: start;
        background: transparent;
        text-align: left;
        cursor: pointer;
        border-top: 1px solid #e2e8f0;
      }

      .activity-item:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .activity-item__icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 18px;
      }

      .activity-item__icon[data-tone='blue'] {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      }

      .activity-item__icon[data-tone='violet'] {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      }

      .activity-item__icon[data-tone='green'] {
        background: linear-gradient(135deg, #10b981, #059669);
      }

      .activity-item__icon[data-tone='amber'] {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }

      .activity-item__icon[data-tone='rose'] {
        background: linear-gradient(135deg, #fb7185, #e11d48);
      }

      .activity-item__icon[data-tone='slate'] {
        background: linear-gradient(135deg, #64748b, #475569);
      }

      .activity-item__content {
        min-width: 0;
      }

      .activity-item__title {
        color: #0f172a;
        font-size: 15px;
        font-weight: 600;
      }

      .activity-item__detail {
        margin-top: 6px;
        color: #64748b;
        font-size: 13px;
        line-height: 1.6;
      }

      .activity-item__time {
        color: #94a3b8;
        font-size: 13px;
        white-space: nowrap;
      }

      .panel-empty {
        min-height: 280px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #64748b;
        font-size: 15px;
      }

      @media (max-width: 768px) {
        .panel-title {
          font-size: 22px;
        }

        .activity-item {
          grid-template-columns: 44px minmax(0, 1fr);
        }

        .activity-item__time {
          grid-column: 2;
        }
      }
    `
  ]
})
export class DashboardActivityListComponent {
  @Input() items: DashboardActivityItem[] = [];

  private readonly router = inject(Router);

  protected open(item: DashboardActivityItem): void {
    if (!item.route) {
      return;
    }

    void this.router.navigate([item.route], { queryParams: item.queryParams });
  }
}
