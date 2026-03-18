import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { HubTimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import type { DashboardPendingItem } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard-pending-list',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule, NzTagModule, HubTimeAgoPipe],
  template: `
    <nz-card class="panel-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">待我处理</div>
          <div class="panel-subtitle">优先处理当前分配给我的工作事项</div>
        </div>
        <button type="button" class="panel-link" (click)="openRoute('/issues')">查看全部</button>
      </div>

      @if (items.length) {
        <div class="panel-list">
          @for (item of items; track item.id) {
            <button type="button" class="pending-item" (click)="open(item)">
              <div class="pending-item__main">
                <div class="pending-item__title">{{ item.title }}</div>
                <div class="pending-item__meta">
                  <span>{{ item.typeLabel }}</span>
                  <span>{{ item.projectName }}</span>
                </div>
                <div class="pending-item__tags">
                  <nz-tag [nzColor]="item.statusColor">{{ item.statusLabel }}</nz-tag>
                  <nz-tag [nzColor]="item.priorityColor">{{ item.priorityLabel }}</nz-tag>
                </div>
              </div>

              <div class="pending-item__time">{{ item.updatedAt | hubTimeAgo }}</div>
            </button>
          }
        </div>
      } @else {
        <div class="panel-empty">
          <span nz-icon nzType="check-circle"></span>
          当前没有待处理事项
        </div>
      }
    </nz-card>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }

      .panel-card {
        height: 100%;
        border: 0;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }

      :host ::ng-deep .ant-card-body {
        box-sizing: border-box;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 24px 28px;
      }

      .panel-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
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

      .panel-link {
        border: 0;
        background: transparent;
        color: #2563eb;
        font-weight: 600;
        cursor: pointer;
      }

      .panel-list {
        flex: 1 1 auto;
        min-height: 0;
        display: grid;
        align-content: start;
        overflow: auto;
        padding-right: 4px;
      }

      .pending-item {
        width: 100%;
        border: 0;
        padding: 16px 0;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        text-align: left;
        background: transparent;
        cursor: pointer;
        border-top: 1px solid #e2e8f0;
      }

      .pending-item:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .pending-item__main {
        min-width: 0;
        display: grid;
        gap: 10px;
      }

      .pending-item__title {
        color: #0f172a;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.5;
      }

      .pending-item__meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        color: #64748b;
        font-size: 13px;
      }

      .pending-item__tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .pending-item__time {
        flex: 0 0 auto;
        color: #94a3b8;
        font-size: 13px;
        white-space: nowrap;
      }

      .panel-empty {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #64748b;
        font-size: 15px;
      }

      :host ::ng-deep .ant-tag {
        margin-inline-end: 0;
        border-radius: 999px;
        font-weight: 600;
      }

      @media (max-width: 768px) {
        .panel-title {
          font-size: 22px;
        }

        .pending-item {
          flex-direction: column;
        }
      }
    `
  ]
})
export class DashboardPendingListComponent {
  @Input() items: DashboardPendingItem[] = [];

  private readonly router = inject(Router);

  protected open(item: DashboardPendingItem): void {
    if (!item.route) {
      return;
    }

    void this.router.navigate([item.route], { queryParams: item.queryParams });
  }

  protected openRoute(route: string): void {
    void this.router.navigate([route]);
  }
}
