import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { DashboardPanelComponent, StatusBadgeComponent } from '@shared/ui';
import type { DashboardReportedIssueItem } from '../../models/dashboard.model';
import { IssueApiService } from '@features/issues/services/issue-api.service';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-reported-issues-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, DashboardPanelComponent, NzPopconfirmModule,NzTooltipModule],
  template: `
    <app-dashboard-panel
      title="我提报未解决"
      icon="alert"
      [count]="total()"
      [actionIcon]="showMoreIcon() ? 'more' : null"
      [actionText]="showMoreIcon() ? '查看更多我提报未解决项' : null"
      [actionLink]="showMoreIcon() ? ['/dashboard/reported-issues'] : []"
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
              @if (canUrge(item)) {
                <button
                  type="button"
                  class="issue__urge-btn"
                  [disabled]="urgingState()[item.entityId] === true"
                  nz-popconfirm
                  nzPopconfirmTitle="确认置顶提醒该测试单吗？"
                  nzPopconfirmOkText="确认"
                  nzPopconfirmCancelText="取消"
                  (nzOnConfirm)="urge(item.entityId)"
                  nz-tooltip
                  nzTooltipTitle="置顶提醒会将该测试单推送到相关人员的待办列表顶部，提醒尽快处理。"
                  (click)="$event.preventDefault(); $event.stopPropagation()"
                >
                  置顶提醒
                </button>
              }
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
      .issue__urge-btn {
        border: 1px solid var(--primary-500);
        color: var(--primary-600);
        background: transparent;
        border-radius: 999px;
        padding: 0 10px;
        height: 24px;
        line-height: 22px;
        cursor: pointer;
      }
      .issue__urge-btn:hover:not(:disabled) {
        background: rgba(59, 130, 246, 0.08);
      }
      .issue__urge-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportedIssuesCardComponent {
  private readonly issueApi = inject(IssueApiService);
  private readonly message = inject(NzMessageService);

  readonly items = input.required<DashboardReportedIssueItem[]>();
  readonly total = input(0);
  readonly projectNames = input<Record<string, string>>({});
  readonly urged = output<void>();
  readonly urgingState = signal<Record<string, boolean>>({});
  readonly showMoreIcon = computed(() => this.total() > 10);

  canUrge(item: DashboardReportedIssueItem): boolean {
    return !!item.assigneeName && ['open', 'in_progress', 'pending_update', 'reopened'].includes(item.status);
  }

  urge(issueId: string): void {
    if (this.urgingState()[issueId]) {
      return;
    }
    this.urgingState.update((current) => ({ ...current, [issueId]: true }));
    this.issueApi
      .urge(issueId)
      .pipe(
        finalize(() => {
          this.urgingState.update((current) => ({ ...current, [issueId]: false }));
        })
      )
      .subscribe({
        next: () => {
          this.message.success('已发送置顶提醒');
          this.urged.emit();
        },
        error: () => {},
      });
  }

  projectLabel(projectId: string): string {
    return this.projectNames()[projectId] || '未知项目';
  }

  assigneeLabel(assigneeName: string | null): string {
    return assigneeName?.trim() ? `负责人 ${assigneeName}` : '暂未指派负责人';
  }
}
