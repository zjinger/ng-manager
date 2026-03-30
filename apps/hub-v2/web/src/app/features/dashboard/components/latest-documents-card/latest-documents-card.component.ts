import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { DashboardPanelComponent } from '@shared/ui';
import type { DashboardDocument } from '../../models/dashboard.model';

@Component({
  selector: 'app-latest-documents-card',
  standalone: true,
  imports: [CommonModule, DatePipe, DashboardPanelComponent],
  template: `
    <app-dashboard-panel
      title="最新文档"
      icon="read"
      [count]="items().length"
      [empty]="items().length === 0"
      emptyText="暂无文档"
    >
      @for (item of items(); track item.id) {
        <div class="document">
          <div class="document__title">{{ item.title }}</div>
          @if (item.summary) {
            <div class="document__summary">{{ item.summary }}</div>
          }
          <div class="document__meta">
            <span class="document__tag">{{ item.category || '文档' }}</span>
            @if (item.version) {
              <span>{{ item.version }}</span>
            }
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
      .document {
        padding: 16px 18px;
        border-top: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
      }
      .document:hover {
        background: var(--bg-subtle);
      }
      .document__title {
        font-weight: 600;
        color: var(--text-primary);
      }
      .document__summary {
        margin-top: 6px;
        color: var(--text-muted);
      }
      .document__meta {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 8px;
        font-size: 12px;
        color: var(--text-disabled);
      }
      .document__tag {
        display: inline-flex;
        padding: 1px 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-info) 12%, transparent);
        color: var(--color-info);
        font-size: 11px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestDocumentsCardComponent {
  readonly items = input.required<DashboardDocument[]>();
  readonly currentProjectId = input<string | null>(null);
  readonly currentProjectName = input<string | null>(null);
  readonly projectNames = input<Record<string, string>>({});

  projectLabel(item: DashboardDocument): string {
    if (!item.projectId) {
      return '全局文档';
    }
    const mapped = this.projectNames()[item.projectId];
    if (mapped) {
      return mapped;
    }
    if (this.currentProjectId() && item.projectId === this.currentProjectId()) {
      return this.currentProjectName() || '项目文档';
    }
    return '项目文档';
  }
}
