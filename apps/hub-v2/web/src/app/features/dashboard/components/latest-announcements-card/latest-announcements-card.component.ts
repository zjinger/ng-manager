import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { DashboardPanelComponent } from '@shared/ui';
import type { DashboardAnnouncement } from '../../models/dashboard.model';

@Component({
  selector: 'app-latest-announcements-card',
  standalone: true,
  imports: [CommonModule, DatePipe, DashboardPanelComponent],
  template: `
    <app-dashboard-panel
      title="最新公告"
      icon="notification"
      [count]="items().length"
      [empty]="items().length === 0"
      emptyText="暂无公告"
    >
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
    </app-dashboard-panel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
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
