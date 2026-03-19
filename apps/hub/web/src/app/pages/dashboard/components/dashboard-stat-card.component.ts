import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { DashboardStatCardData, DashboardStatCardKey } from '../models/dashboard.model';

type CardStatus = {
  [K in DashboardStatCardKey]?: String;
};

const cardStatus: CardStatus = {
  pending: 'todo',
  verify: 'resolved',
  'rd-doing': 'doing',
  'reported-issues': 'issues',
  'reported-active': 'active',
  'rd-blocked': 'blocked',
  'rd-review': 'review',
  announcements: 'announcements',
  docs: 'docs',
  projects: 'projects',
};
@Component({
  selector: 'app-dashboard-stat-card',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule],
  template: `
    <nz-card class="stat-card">
      <button type="button" class="stat-card__button" (click)="open()">
        <div class="stat-card__icon" [attr.data-tone]="item.tone">
          <span nz-icon [nzType]="item.icon"></span>
        </div>

        <div class="stat-card__content">
          <div class="stat-card__label">{{ item.label }}</div>
          <div class="stat-card__value">{{ item.value }}</div>
          <div class="stat-card__helper">{{ item.helper }}</div>
        </div>

        @if (item.route) {
          <span class="stat-card__arrow" nz-icon nzType="arrow-right"></span>
        }
      </button>
    </nz-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .stat-card {
        height: 100%;
        border: 0;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }

      .stat-card__button {
        width: 100%;
        min-height: 144px;
        border: 0;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), #fff);
        padding: 22px 20px;
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) auto;
        gap: 16px;
        align-items: center;
        text-align: left;
        cursor: pointer;
      }

      .stat-card__icon {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 22px;
      }

      .stat-card__icon[data-tone='blue'] {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
      }

      .stat-card__icon[data-tone='violet'] {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
      }

      .stat-card__icon[data-tone='green'] {
        background: linear-gradient(135deg, #059669, #047857);
      }

      .stat-card__icon[data-tone='amber'] {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }

      .stat-card__icon[data-tone='rose'] {
        background: linear-gradient(135deg, #f43f5e, #e11d48);
      }

      .stat-card__icon[data-tone='slate'] {
        background: linear-gradient(135deg, #475569, #334155);
      }

      .stat-card__content {
        min-width: 0;
      }

      .stat-card__label {
        color: #64748b;
        font-size: 14px;
        font-weight: 600;
      }

      .stat-card__value {
        margin-top: 8px;
        color: #0f172a;
        font-size: 34px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: -0.04em;
      }

      .stat-card__helper {
        margin-top: 10px;
        color: #94a3b8;
        font-size: 13px;
        line-height: 1.5;
      }

      .stat-card__arrow {
        color: #94a3b8;
        font-size: 16px;
      }

      @media (max-width: 768px) {
        .stat-card__button {
          min-height: 132px;
          grid-template-columns: 52px minmax(0, 1fr);
        }

        .stat-card__arrow {
          display: none;
        }

        .stat-card__value {
          font-size: 30px;
        }
      }
    `,
  ],
})
export class DashboardStatCardComponent {
  @Input({ required: true }) item!: DashboardStatCardData;

  private readonly router = inject(Router);

  protected open(): void {
    if (!this.item.route) {
      return;
    }

    void this.router.navigate([this.item.route], {
      queryParams: { ...this.item.queryParams, status: cardStatus[this.item.key] },
    });
  }
}
