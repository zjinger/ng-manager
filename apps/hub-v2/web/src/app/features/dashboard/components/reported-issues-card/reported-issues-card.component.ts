import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardPanelComponent, StatusBadgeComponent } from '@shared/ui';
import type { DashboardReportedIssueItem } from '../../models/dashboard.model';

@Component({
  selector: 'app-reported-issues-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, DashboardPanelComponent],
  template: `
    <app-dashboard-panel
      title="我提报未解决"
      icon="alert"
      [count]="items().length"
      [empty]="items().length === 0"
      emptyText="当前没有我提报且未解决的测试单"
    >
      @for (item of items(); track item.entityId) {
        <a class="issue" [routerLink]="['/issues', item.entityId]">
          <div class="issue__priority"></div>
          <div class="issue__body">
            <div class="issue__title">
              <span class="issue__code">{{ item.code }}</span>
              <span>{{ item.title }}</span>
            </div>
            <div class="issue__meta">
              <app-status-badge [status]="item.status" />
              <span>{{ projectLabel(item.projectId) }}</span>
              <span>{{ assigneeLabel(item.assigneeName) }}</span>
              <span>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
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
      }
      .issue {
        display: flex;
        gap: 12px;
        padding: 14px 18px;
        border-top: 1px solid var(--border-color-soft);
        color: inherit;
        text-decoration: none;
        transition: var(--transition-base);
      }
      .issue:hover {
        background: var(--bg-subtle);
      }
      .issue__priority {
        width: 4px;
        flex-shrink: 0;
        border-radius: 2px;
        background: var(--color-warning);
      }
      .issue__body {
        min-width: 0;
      }
      .issue__title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-primary);
        font-weight: 600;
      }
      .issue__code {
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .issue__meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
        color: var(--text-disabled);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportedIssuesCardComponent {
  readonly items = input.required<DashboardReportedIssueItem[]>();
  readonly projectNames = input<Record<string, string>>({});

  projectLabel(projectId: string): string {
    return this.projectNames()[projectId] || '未知项目';
  }

  assigneeLabel(assigneeName: string | null): string {
    return assigneeName?.trim() ? `负责人 ${assigneeName}` : '暂未指派负责人';
  }
}
