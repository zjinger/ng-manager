import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import type { DashboardAnnouncement } from '../../models/dashboard.model';

@Component({
  selector: 'app-latest-announcements-card',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h3 class="panel__title">最新公告</h3>
        <span class="panel__count">{{ items().length }}</span>
      </header>

      @if (items().length === 0) {
        <div class="panel__empty">暂无公告</div>
      } @else {
        @for (item of items(); track item.id) {
          <div class="announcement">
            <div class="announcement__title">
              @if (item.pinned) {
                <span class="pin">置顶</span>
              }
              {{ item.title }}
            </div>
            @if (item.summary) {
              <div class="announcement__summary">{{ item.summary }}</div>
            }
            <div class="announcement__meta">
              <span>{{ projectLabel(item) }}</span>
              <span>{{ item.publishAt | date: 'yyyy-MM-dd HH:mm' }}</span>
            </div>
          </div>
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
      .announcement {
        padding: 16px 18px;
        border-top: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }
      .announcement:hover {
        background: var(--bg-subtle);
      }
      .announcement__title {
        font-weight: 600;
        color: var(--text-primary);
      }
      .announcement__summary {
        margin-top: 6px;
        color: var(--text-muted);
      }
      .announcement__meta {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 6px;
        font-size: 12px;
        color: var(--text-disabled);
      }
      .pin {
        display: inline-flex;
        padding: 1px 6px;
        border-radius: 999px;
        background: var(--color-warning-light);
        color: var(--color-warning-hover);
        font-size: 11px;
        margin-right: 6px;
      }
      :host-context(html[data-theme='dark']) .panel {
        border-color: rgba(148, 163, 184, 0.14);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 26%),
          var(--bg-container);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestAnnouncementsCardComponent {
  readonly items = input.required<DashboardAnnouncement[]>();
  readonly currentProjectId = input<string | null>(null);
  readonly currentProjectName = input<string | null>(null);
  readonly projectNames = input<Record<string, string>>({});

  projectLabel(item: DashboardAnnouncement): string {
    if (!item.projectId) {
      return '全局公告';
    }
    const mapped = this.projectNames()[item.projectId];
    if (mapped) {
      return mapped;
    }
    if (this.currentProjectId() && item.projectId === this.currentProjectId()) {
      return this.currentProjectName() || '项目公告';
    }
    return '项目公告';
  }
}
