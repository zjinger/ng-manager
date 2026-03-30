import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import type { DashboardDocument } from '../../models/dashboard.model';

@Component({
  selector: 'app-latest-documents-card',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <h3 class="panel__title">最新文档</h3>
        <span class="panel__count">{{ items().length }}</span>
      </header>

      @if (items().length === 0) {
        <div class="panel__empty">暂无文档</div>
      } @else {
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
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .panel {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
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
        flex: 1;
        display: grid;
        place-items: center;
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
