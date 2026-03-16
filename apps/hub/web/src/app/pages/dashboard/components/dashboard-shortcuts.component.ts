import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { DashboardShortcutItem } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard-shortcuts',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    <section class="shortcut-section">
      <div class="shortcut-head">
        <div>
          <div class="shortcut-title">快捷入口</div>
          <div class="shortcut-subtitle">常用页面一键直达</div>
        </div>
      </div>

      <div class="shortcut-grid">
        @for (item of items; track item.key) {
          <button type="button" class="shortcut-card" (click)="open(item)">
            <div class="shortcut-card__icon" [attr.data-tone]="item.tone">
              <span nz-icon [nzType]="item.icon"></span>
            </div>
            <div class="shortcut-card__title">{{ item.label }}</div>
            <div class="shortcut-card__desc">{{ item.description }}</div>
          </button>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .shortcut-section {
        padding: 26px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(248, 250, 252, 0.9), #fff);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }

      .shortcut-title {
        color: #0f172a;
        font-size: 24px;
        font-weight: 700;
      }

      .shortcut-subtitle {
        margin-top: 6px;
        color: #64748b;
        font-size: 14px;
      }

      .shortcut-grid {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 14px;
      }

      .shortcut-card {
        border: 0;
        border-radius: 18px;
        padding: 18px 16px;
        display: grid;
        gap: 12px;
        text-align: left;
        cursor: pointer;
        background: #f8fafc;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }

      .shortcut-card:hover {
        transform: translateY(-2px);
        background: #fff;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
      }

      .shortcut-card__icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 18px;
      }

      .shortcut-card__icon[data-tone='blue'] {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      }

      .shortcut-card__icon[data-tone='violet'] {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      }

      .shortcut-card__icon[data-tone='green'] {
        background: linear-gradient(135deg, #10b981, #059669);
      }

      .shortcut-card__icon[data-tone='amber'] {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }

      .shortcut-card__icon[data-tone='rose'] {
        background: linear-gradient(135deg, #fb7185, #e11d48);
      }

      .shortcut-card__icon[data-tone='slate'] {
        background: linear-gradient(135deg, #64748b, #334155);
      }

      .shortcut-card__title {
        color: #0f172a;
        font-size: 16px;
        font-weight: 600;
      }

      .shortcut-card__desc {
        color: #64748b;
        font-size: 13px;
        line-height: 1.6;
      }

      @media (max-width: 1400px) {
        .shortcut-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 768px) {
        .shortcut-section {
          padding: 20px;
        }

        .shortcut-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 520px) {
        .shortcut-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class DashboardShortcutsComponent {
  @Input() items: DashboardShortcutItem[] = [];

  private readonly router = inject(Router);

  protected open(item: DashboardShortcutItem): void {
    void this.router.navigate([item.route], { queryParams: item.queryParams });
  }
}
