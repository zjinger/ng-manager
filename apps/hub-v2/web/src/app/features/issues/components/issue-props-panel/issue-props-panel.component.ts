import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ISSUE_STATUS_LABELS } from '../../../../shared/constants/status-options';
import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import { PriorityBadgeComponent } from '../../../../shared/ui/priority-badge/priority-badge.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import type { IssueEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-props-panel',
  standalone: true,
  imports: [DatePipe, PanelCardComponent, PriorityBadgeComponent, StatusBadgeComponent],
  template: `
    <app-panel-card title="属性">
      <dl class="props">
        <div>
          <dt>状态</dt>
          <dd><app-status-badge [status]="issue().status" [label]="statusLabel(issue().status)" /></dd>
        </div>
        <div>
          <dt>优先级</dt>
          <dd><app-priority-badge [priority]="issue().priority" /></dd>
        </div>
        <div>
          <dt>类型</dt>
          <dd>{{ issueTypeLabel(issue().type) }}</dd>
        </div>
        <div>
          <dt>提报人</dt>
          <dd class="person-cell"><span class="mini-avatar">{{ avatarText(issue().reporterName) }}</span><span>{{ issue().reporterName }}</span></dd>
        </div>
        <div>
          <dt>负责人</dt>
          <dd class="person-cell">
            @if (issue().assigneeName) {
              <span class="mini-avatar">{{ avatarText(issue().assigneeName!) }}</span>
            }
            <span>{{ issue().assigneeName || '未指派' }}</span>
          </dd>
        </div>
        <div>
          <dt>验证人</dt>
          <dd class="person-cell">
            @if (issue().verifierName) {
              <span class="mini-avatar">{{ avatarText(issue().verifierName!) }}</span>
            }
            <span>{{ issue().verifierName || '未设置' }}</span>
          </dd>
        </div>
        <div>
          <dt>模块</dt>
          <dd>{{ issue().moduleCode || '未设置' }}</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>{{ issue().versionCode || '未设置' }}</dd>
        </div>
        <div>
          <dt>环境</dt>
          <dd>{{ issue().environmentCode || '未设置' }}</dd>
        </div>
        <div>
          <dt>创建时间</dt>
          <dd class="meta-cell">{{ issue().createdAt | date: 'yyyy-MM-dd HH:mm' }}</dd>
        </div>
      </dl>
    </app-panel-card>
  `,
  styles: [
    `
      .props {
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
      }
      .props div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 15px 20px;
        border-top: 1px solid var(--border-color-soft);
      }
      dt {
        color: var(--text-muted);
      }
      dd {
        margin: 0;
        color: var(--text-primary);
        font-weight: 600;
        text-align: right;
      }
      .person-cell {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      .meta-cell {
        font-size: 12px;
        color: var(--text-muted);
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
        flex-shrink: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePropsPanelComponent {
  readonly issue = input.required<IssueEntity>();

  statusLabel(status: string): string {
    return ISSUE_STATUS_LABELS[status] || status;
  }

  issueTypeLabel(type: string): string {
    return (
      {
        bug: 'Bug',
        task: 'Task',
        support: 'Support',
      }[type] || type
    );
  }

  avatarText(name: string): string {
    return name.slice(0, 1);
  }
}
