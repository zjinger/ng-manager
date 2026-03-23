import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { PriorityBadgeComponent } from '../../../../shared/ui/priority-badge/priority-badge.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import type { IssueEntity } from '../../models/issue.model';
import type { IssueListViewMode } from '../issue-filter-bar/issue-filter-bar.component';

@Component({
  selector: 'app-issue-list-table',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PriorityBadgeComponent, StatusBadgeComponent, DatePipe],
  template: `
    @if (viewMode() === 'card') {
        <div class="issue-card-grid">
        @for (item of items(); track item.id) {
          <button
            type="button"
            class="issue-card"
            [class.is-active]="activeIssueId() === item.id"
            (click)="open.emit(item.id)"
          >
            <div class="issue-card__header">
              <span class="issue-card__id">{{ item.issueNo }}</span>
              <app-status-badge [status]="item.status" />
            </div>
            <div class="issue-card__title">{{ item.title }}</div>
            <div class="issue-card__desc">{{ item.description || '暂无详细描述，待补充复现路径和环境信息。' }}</div>
            <div class="issue-card__tags">
              <app-priority-badge [priority]="item.priority" />
              <span class="issue-card__type">{{ issueTypeLabel(item.type) }}</span>
            </div>
            <div class="issue-card__footer">
              <div class="issue-card__assignee">
                <span class="mini-avatar">{{ avatarText(item.assigneeName || item.reporterName) }}</span>
                <span>{{ item.assigneeName || '未指派' }}</span>
              </div>
              <span class="issue-card__time">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
            </div>
          </button>
        }
      </div>
    } @else {
      <app-data-table>
        <div table-head class="issue-table__head">
          <div>编号</div>
          <div>标题</div>
          <div>状态</div>
          <div>优先级</div>
          <div>负责人</div>
          <div>更新时间</div>
        </div>
        <div table-body class="issue-table__body">
          @for (item of items(); track item.id) {
            <button
              type="button"
              class="issue-row"
              [class.is-active]="activeIssueId() === item.id"
              (click)="open.emit(item.id)"
            >
              <div class="issue-row__id">{{ item.issueNo }}</div>
              <div class="issue-row__title">
                <div class="issue-row__title-text">{{ item.title }}</div>
                <div class="issue-row__meta">{{ issueTypeLabel(item.type) }} · {{ item.reporterName }}</div>
              </div>
              <div><app-status-badge [status]="item.status" /></div>
              <div><app-priority-badge [priority]="item.priority" /></div>
              <div class="issue-row__assignee">
                <span class="mini-avatar">{{ avatarText(item.assigneeName || item.reporterName) }}</span>
                <span>{{ item.assigneeName || '未指派' }}</span>
              </div>
              <div class="issue-row__time">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
            </button>
          }
        </div>
      </app-data-table>
    }
  `,
  styles: [
    `
      .issue-table__head,
      .issue-row {
        display: grid;
        grid-template-columns: 120px minmax(0, 1.8fr) 120px 110px 150px 110px;
        gap: 16px;
        align-items: center;
      }
      .issue-table__head {
        padding: 10px 16px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-color-soft);
      }
      .issue-row {
        padding: 14px 16px;
        width: 100%;
        border: 0;
        text-align: left;
        background: transparent;
        color: inherit;
        border-bottom: 1px solid var(--border-color-soft);
        transition: var(--transition-base);
        cursor: pointer;
      }
      .issue-row:last-child {
        border-bottom: 0;
      }
      .issue-row:hover {
        background: var(--bg-subtle);
      }
      .issue-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle);
        box-shadow: inset 3px 0 0 var(--primary-600);
      }
      .issue-row__id,
      .issue-card__id {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 13px;
        font-weight: 700;
        color: var(--primary-700);
      }
      .issue-row__title-text,
      .issue-card__title {
        font-size: 14px;
        font-weight: 600;
        color: var(--gray-900);
      }
      .issue-row__meta,
      .issue-card__time {
        margin-top: 4px;
        font-size: 12px;
        color: var(--gray-400);
      }
      .issue-row__assignee,
      .issue-card__assignee {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .issue-row__time {
        font-size: 12px;
        color: var(--gray-400);
      }
      .mini-avatar {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        font-size: 10px;
        font-weight: 700;
      }
      .issue-card-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
      .issue-card {
        display: flex;
        flex-direction: column;
        min-height: 220px;
        padding: 16px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%),
          var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: var(--shadow-sm);
        width: 100%;
        text-align: left;
        cursor: pointer;
        appearance: none;
        color: inherit;
        transition: var(--transition-base);
      }
      .issue-card:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--primary-200);
        transform: translateY(-1px);
      }
      .issue-card.is-active {
        border-color: var(--primary-400);
        box-shadow:
          0 18px 36px rgba(79, 70, 229, 0.14),
          0 0 0 1px rgba(79, 70, 229, 0.18);
      }
      .issue-card__header,
      .issue-card__footer,
      .issue-card__tags {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .issue-card__title {
        margin-top: 10px;
        line-height: 1.4;
      }
      .issue-card__desc {
        margin: 8px 0 12px;
        flex: 1;
        font-size: 12px;
        line-height: 1.5;
        color: var(--gray-500);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .issue-card__type {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        background: rgba(59, 130, 246, 0.14);
        color: var(--color-info);
      }
      .issue-card__footer {
        padding-top: 10px;
        border-top: 1px solid var(--border-color-soft);
      }
      :host-context(html[data-theme='dark']) .issue-card {
        border-color: rgba(148, 163, 184, 0.14);
      }
      :host-context(html[data-theme='dark']) .issue-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle);
      }
      :host-context(html[data-theme='dark']) .issue-card__type {
        background: rgba(59, 130, 246, 0.18);
      }
      :host-context(html[data-theme='dark']) .issue-card.is-active {
        border-color: rgba(129, 140, 248, 0.7);
        box-shadow:
          0 18px 40px rgba(15, 23, 42, 0.28),
          0 0 0 1px rgba(129, 140, 248, 0.28);
      }
      @media (max-width: 1200px) {
        .issue-card-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 960px) {
        .issue-table__head {
          display: none;
        }
        .issue-row {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .issue-card-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueListTableComponent {
  readonly items = input.required<IssueEntity[]>();
  readonly viewMode = input<IssueListViewMode>('list');
  readonly activeIssueId = input<string | null>(null);
  readonly open = output<string>();

  issueTypeLabel(type: IssueEntity['type']): string {
    return (
      {
        bug: 'Bug',
        task: 'Task',
        support: 'Support',
      }[type] ?? type
    );
  }

  avatarText(name: string): string {
    return name.slice(0, 1);
  }
}
