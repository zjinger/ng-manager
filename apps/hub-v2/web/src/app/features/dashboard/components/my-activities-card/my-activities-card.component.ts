import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { DashboardPanelComponent } from '@shared/ui';
import type { DashboardActivityItem } from '../../models/dashboard.model';

@Component({
  selector: 'app-my-activities-card',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardPanelComponent],
  template: `
    <app-dashboard-panel
      title="我的动态"
      icon="bar-chart"
      [count]="items().length"
      [empty]="items().length === 0"
      emptyText="最近还没有动态"
    >
      @for (item of items(); track item.kind + '-' + item.entityId + '-' + item.createdAt) {
        <a
          class="activity"
          [routerLink]="detailLink(item).path"
          [queryParams]="detailLink(item).query"
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
                {{ kindLabel(item.kind) }}
              </span>
              <span>{{ projectLabel(item.projectId) }}</span>
              <span>{{ item.createdAt | date: 'MM-dd HH:mm' }}</span>
            </div>
          </div>
        </a>
      }
    </app-dashboard-panel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
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
      .activity__dot[data-kind='content_activity'] {
        background: var(--color-warning);
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
      .activity__tag[data-kind='content_activity'] {
        background: color-mix(in srgb, var(--color-warning) 18%, transparent);
        color: var(--color-warning-hover);
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
  readonly projectNames = input<Record<string, string>>({});

  detailLink(item: DashboardActivityItem): { path: string[]; query?: Record<string, string> } {
    if (item.kind === 'content_activity') {
      return { path: this.contentDetailPath(item) };
    }
    if (item.kind === 'rd_activity') {
      return { path: ['/rd', item.entityId] };
    }
    return { path: ['/issues', item.entityId] };
  }

  projectLabel(projectId: string): string {
    if (!projectId) {
      return '全局';
    }
    return this.projectNames()[projectId] || '未知项目';
  }

  kindLabel(kind: DashboardActivityItem['kind']): string {
    if (kind === 'rd_activity') {
      return '研发项';
    }
    if (kind === 'content_activity') {
      return '内容动态';
    }
    return '测试单';
  }

  private contentDetailPath(item: DashboardActivityItem): string[] {
    const action = item.action.trim();
    const [category] = action.split('.');
    if (category === 'announcement') {
      return ['/content', 'announcements', item.entityId];
    }
    if (category === 'document') {
      return ['/content', 'documents', item.entityId];
    }
    if (category === 'release') {
      return ['/content', 'releases', item.entityId];
    }
    return ['/content'];
  }

}
