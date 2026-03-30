import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type DashboardShortcutItem = {
  key: string;
  label: string;
  description: string;
  route: string;
  queryParams?: Record<string, string>;
  state?: Record<string, unknown>;
  icon: string;
  tone: 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'slate';
};

@Component({
  selector: 'app-dashboard-shortcuts',
  standalone: true,
  imports: [RouterLink, NzIconModule],
  template: `
    <section class="shortcut-section">
      <div class="shortcut-head">
        <div class="shortcut-title">快捷入口</div>
        <div class="shortcut-subtitle">常用页面一键直达</div>
      </div>

      <div class="shortcut-grid">
        @for (item of items(); track item.key) {
          <a class="shortcut-card" [routerLink]="item.route" [queryParams]="item.queryParams" [state]="item.state">
            <div class="shortcut-card__icon" [attr.data-tone]="item.tone">
              <span nz-icon [nzType]="item.icon"></span>
            </div>
            <div class="shortcut-card__title">{{ item.label }}</div>
            <div class="shortcut-card__desc">{{ item.description }}</div>
          </a>
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
        margin-top: 20px;
        padding: 20px;
        border-radius: 16px;
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-sm);
      }
      .shortcut-title {
        color: var(--text-heading);
        font-size: 18px;
        font-weight: 700;
      }
      .shortcut-subtitle {
        margin-top: 4px;
        color: var(--text-muted);
        font-size: 13px;
      }
      .shortcut-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 12px;
      }
      .shortcut-card {
        border-radius: 14px;
        padding: 14px 12px;
        display: grid;
        gap: 8px;
        text-decoration: none;
        background: var(--bg-subtle);
        border: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }
      .shortcut-card:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
        border-color: var(--border-color);
      }
      .shortcut-card__icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 15px;
      }
      .shortcut-card__icon[data-tone='blue'] {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
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
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }
      .shortcut-card__desc {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.5;
      }
      @media (max-width: 1400px) {
        .shortcut-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 768px) {
        .shortcut-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 520px) {
        .shortcut-grid {
          grid-template-columns: 1fr;
        }
      }
      :host-context(html[data-theme='dark']) .shortcut-section {
        border-color: rgba(148, 163, 184, 0.14);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 35%),
          var(--bg-container);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardShortcutsComponent {
  readonly items = input.required<DashboardShortcutItem[]>();
}
