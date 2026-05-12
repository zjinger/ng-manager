import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface QuickEntryItem {
  icon: string;
  title: string;
  meta: string;
  routerLink?: string[]; // 路由链接
  onClick?: () => void; // 点击回调
  disabled?: boolean;
}

@Component({
  selector: 'financing-quick-entry-card',
  standalone: true,
  imports: [CommonModule, RouterLink, NzIconModule],
  template: `
    <div class="quick-entry-panel">
      <header class="panel__header">
        <div class="panel__heading">
          <h3 class="panel__title">快捷入口</h3>
          @if (showMoreLink()) {
          <a class="panel__more" [routerLink]="moreLink()">更多</a>
          }
        </div>
      </header>

      <div class="panel__body">
        @for (item of items(); track $index) {
        <!-- 方式一：如果有 routerLink，使用 a 标签 -->
        @if (item.routerLink && !item.disabled) {
        <a
          class="panel__item panel__item--link"
          [routerLink]="item.routerLink"
          [style.background]="getItemBackground($index)"
        >
          <div class="item__icon-wrapper">
            <nz-icon [nzType]="item.icon" nzTheme="outline" />
          </div>
          <div class="item__content">
            <div class="item__title">{{ item.title }}</div>
            <div class="item__meta">{{ item.meta }}</div>
          </div>
        </a>
        } @else {
        <!-- 方式二：如果没有 routerLink 或禁用，使用 div -->
        <div
          class="panel__item"
          [class.panel__item--disabled]="item.disabled"
          [style.background]="getItemBackground($index)"
          (click)="handleItemClick(item)"
        >
          <div class="item__icon-wrapper">
            <nz-icon [nzType]="item.icon" nzTheme="outline" />
          </div>
          <div class="item__content">
            <div class="item__title">{{ item.title }}</div>
            <div class="item__meta">{{ item.meta }}</div>
          </div>
        </div>
        } }
      </div>
    </div>
  `,
  styles: [
    `
      .quick-entry-panel {
        width: 100%;
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        transition: all 0.2s ease;
      }

      .panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border-color-soft);
        flex-shrink: 0;
      }

      .panel__title {
        margin: 0;
        color: var(--text-heading);
        font-size: 15px;
        font-weight: 600;
      }

      .panel__heading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .panel__more {
        font-size: 12px;
        color: var(--primary-500);
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
          color: var(--primary-600);
          text-decoration: underline;
        }
      }

      .panel__body {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        padding: 16px 18px;
      }

      .panel__item {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        border: 1px solid transparent;
        border-radius: 12px;
        padding: 12px;
        transition: all 0.2s ease;
        text-decoration: none;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: var(--primary-300, #a5b4fc);
        }

        &:active {
          transform: translateY(0);
        }
      }

      .panel__item--link {
        color: inherit;
      }

      .panel__item--disabled {
        opacity: 0.5;
        cursor: not-allowed;

        &:hover {
          transform: none;
          border-color: transparent;
        }
      }

      .item__icon-wrapper {
        flex-shrink: 0;

        [nz-icon] {
          font-size: 24px;
          color: var(--primary-500, #4f46e5);
        }
      }

      .item__content {
        flex: 1;
        min-width: 0;
      }

      .item__title {
        font-weight: 600;
        font-size: 0.875rem;
        line-height: 1.4rem;
        color: var(--text-primary, #1e293b);
        display: block;
        margin-bottom: 4px;
      }

      .item__meta {
        font-size: 0.75rem;
        line-height: 1rem;
        color: #64748b;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* 暗色主题适配 */
      :host-context(html[data-theme='dark']) .panel__item {
        background: var(--bg-subtle) !important;

        &:hover {
          background: var(--bg-hover) !important;
        }
      }

      :host-context(html[data-theme='dark']) .item__meta {
        color: #94a3b8;
      }

      :host-context(html[data-theme='dark']) .item__title {
        color: #e2e8f0;
      }

      /* 响应式适配 */
      @media (max-width: 640px) {
        .panel__body {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .panel__item {
          padding: 10px;
        }

        .item__icon-wrapper [nz-icon] {
          font-size: 20px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancingQuickEntryComponent {
  readonly items = input<QuickEntryItem[]>([
    {
      icon: 'plus-circle',
      title: '差旅费报销',
      meta: '行程与交通住宿',
      routerLink: ['/travel-expense/new'],
    },
    {
      icon: 'file-text',
      title: '费用报销',
      meta: '办公采购等',
      routerLink: ['/expense/new'],
    },
    {
      icon: 'history',
      title: '我的报销',
      meta: '查看进度',
      routerLink: ['/my-expenses'],
    },
    {
      icon: 'bar-chart',
      title: '报销统计',
      meta: '费用趋势',
      routerLink: ['/financing/statistics'],
    },
  ]);

  readonly showMoreLink = input(false);
  readonly moreLink = input<string[]>(['/financing']);

  private readonly backgrounds = ['#eef2ff', '#eff6ff', '#ecfdf5', '#fffbeb'];

  getItemBackground(index: number): string {
    return this.backgrounds[index % this.backgrounds.length];
  }

  handleItemClick(item: QuickEntryItem): void {
    if (item.disabled) return;

    if (item.onClick) {
      item.onClick();
      return;
    }
  }
}
