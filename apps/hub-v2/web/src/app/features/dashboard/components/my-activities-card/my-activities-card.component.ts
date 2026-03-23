import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import type { DashboardActivityItem } from '../../models/dashboard.model';

@Component({
  selector: 'app-my-activities-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h3 class="panel__title">我的动态</h3>
        <span class="panel__count">{{ items().length }}</span>
      </header>

      @if (items().length === 0) {
        <div class="panel__empty">最近还没有动态</div>
      } @else {
        @for (item of items(); track item.kind + '-' + item.entityId + '-' + item.createdAt) {
          <a
            class="activity"
            [routerLink]="item.kind === 'rd_activity' ? ['/rd'] : ['/issues', item.entityId]"
          >
            <div class="activity__dot" [attr.data-kind]="item.kind"></div>
            <div class="activity__body">
              <div class="activity__title">
                <span class="activity__code">{{ item.code }}</span>
                <span>{{ item.title }}</span>
              </div>
              <div class="activity__summary">{{ item.summary || item.action }}</div>
              <div class="activity__meta">
                <span class="activity__tag" [attr.data-kind]="item.kind">
                  {{ item.kind === 'rd_activity' ? 'RD' : 'ISSUE' }}
                </span>
                <span>{{ item.createdAt | date: 'MM-dd HH:mm' }}</span>
              </div>
            </div>
          </a>
        }
      }
    </section>
  `,
  styles: [
    `
      .panel {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        position: relative;
      }
      .panel::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 26%);
      }
      .panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .panel__title {
        margin: 0;
        color: var(--text-heading);
        font-size: 15px;
        font-weight: 600;
      }
      .panel__count {
        padding: 1px 8px;
        border-radius: 10px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 500;
      }
      .panel__empty {
        padding: 32px 18px;
        text-align: center;
        color: var(--text-disabled);
      }
      .activity {
        display: grid;
        grid-template-columns: 16px 1fr;
        gap: 12px;
        padding: 14px 18px;
        border-top: 1px solid var(--border-color-soft);
        color: inherit;
        text-decoration: none;
        transition: var(--transition-base);
      }
      .activity:hover {
        background: var(--bg-subtle);
      }
      .activity__dot {
        width: 10px;
        height: 10px;
        margin-top: 6px;
        border-radius: 50%;
        background: var(--color-info);
      }
      .activity__dot[data-kind='rd_activity'] {
        background: var(--primary-500);
      }
      .activity__body {
        min-width: 0;
      }
      .activity__title {
        display: flex;
        gap: 8px;
        color: var(--text-primary);
        font-weight: 600;
      }
      .activity__code {
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .activity__summary {
        margin-top: 4px;
        color: var(--text-muted);
      }
      .activity__meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        color: var(--text-disabled);
        font-size: 12px;
      }
      .activity__tag {
        display: inline-flex;
        padding: 1px 6px;
        border-radius: 4px;
        background: var(--color-info-light);
        color: var(--color-info);
        font-size: 11px;
        font-weight: 600;
      }
      .activity__tag[data-kind='rd_activity'] {
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-500);
      }
      :host-context(html[data-theme='dark']) .panel {
        border-color: rgba(148, 163, 184, 0.14);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 26%),
          var(--bg-container);
      }
      :host-context(html[data-theme='dark']) .activity__tag {
        background: rgba(59, 130, 246, 0.16);
      }
      :host-context(html[data-theme='dark']) .activity__tag[data-kind='rd_activity'] {
        background: color-mix(in srgb, var(--primary-500) 18%, transparent);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyActivitiesCardComponent {
  readonly items = input.required<DashboardActivityItem[]>();
}
