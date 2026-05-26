import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ISSUE_STATUS_LABELS } from '@shared/constants';
import { PanelCardComponent, PriorityBadgeComponent, StatusBadgeComponent, TypeBadgeComponent } from '@shared/ui';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { IssueEntity, IssueParticipantEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-props-panel',
  standalone: true,
  imports: [DatePipe, RouterLink, NzToolTipModule, PanelCardComponent, PriorityBadgeComponent, StatusBadgeComponent, TypeBadgeComponent],
  template: `
    <app-panel-card title="基础信息">
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
          <dd><app-type-badge [type]="issue().type" />
          </dd>
        </div>
        <div>
          <dt>提报人</dt>
          <dd class="person-cell">
            <!-- <span class="mini-avatar">{{ avatarText(issue().reporterName) }}</span> -->
            <span style="text-align:left">{{ issue().reporterName }}</span>
          </dd>
        </div>
        <div>
          <dt>负责人</dt>
          <dd class="person-cell">
            <!-- @if (issue().assigneeName) {
              <span class="mini-avatar">{{ avatarText(issue().assigneeName!) }}</span>
            } -->
            <span class="assignee-name">{{ issue().assigneeName || '未指派' }}</span>
            @if(participants().length) {
                 @for (participant of participants(); track participant) {
                    <span class="meta-cell">{{ participant.userName }}</span>
                 }
            }
          </dd>
        </div>
        <div>
          <dt>验证人</dt>
          <dd class="person-cell">
            <!-- @if (issue().verifierName) {
              <span class="mini-avatar">{{ avatarText(issue().verifierName!) }}</span>
            } -->
            <span>{{ issue().verifierName || '-' }}</span>
          </dd>
        </div>
        <div>
          <dt>关联研发项</dt>
          <dd>
            @if (issue().rdNoSnapshot) {
              @if (issue().rdItemId) {
                <a
                  class="rd-link"
                  [routerLink]="['/rd', issue().rdItemId]"
                  nz-tooltip
                  [nzTooltipTitle]="rdLinkText()"
                >
                  <span class="rd-link__code">{{ issue().rdNoSnapshot }}</span>
                  @if (issue().rdTitleSnapshot) {
                    <span class="rd-link__title">{{ issue().rdTitleSnapshot }}</span>
                  }
                </a>
              } @else {
                <span class="rd-link rd-link--readonly" nz-tooltip [nzTooltipTitle]="rdLinkText()">
                  <span class="rd-link__code">{{ issue().rdNoSnapshot }}</span>
                  @if (issue().rdTitleSnapshot) {
                    <span class="rd-link__title">{{ issue().rdTitleSnapshot }}</span>
                  }
                </span>
              }
            } @else {
              <span class="meta-cell">未关联研发项</span>
            }
          </dd>
        </div>
        <div>
          <dt>子项目/模块</dt>
          <dd>{{ issue().moduleCode || '-' }}</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>{{ issue().versionCode || '-' }}</dd>
        </div>
        <div>
          <dt>环境</dt>
          <dd>{{ issue().environmentCode || '-' }}</dd>
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
        min-width: 0;
        padding: 12px 20px;
        border-top: 1px solid var(--border-color-soft);
      }
      dt {
        flex: 0 0 auto;
        color: var(--text-muted);
        white-space: nowrap;
      }
      dd {
        min-width: 0;
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
      .assignee-name {
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .meta-cell {
        font-size: 12px;
        color: var(--text-muted);
      }
      .rd-link {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        max-width: 100%;
        min-width: 0;
        color: var(--primary-700);
        text-decoration: none;
        vertical-align: top;
      }
      .rd-link__code {
        flex: 0 0 auto;
        font-size: 12px;
        font-weight: 700;
      }
      .rd-link__title {
        min-width: 0;
        font-size: 12px;
        color: var(--primary-700);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rd-link--readonly {
        color: var(--text-primary);
      }
      .rd-link--readonly .rd-link__code,
      .rd-link--readonly .rd-link__title {
        color: var(--text-primary);
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
  readonly participants = input<IssueParticipantEntity[]>([]);
  readonly rdLinkText = computed(() =>
    [this.issue().rdNoSnapshot, this.issue().rdTitleSnapshot].filter(Boolean).join(' ')
  );

  statusLabel(status: string): string {
    return ISSUE_STATUS_LABELS[status] || status;
  }

  avatarText(name: string): string {
    return name.slice(0, 1);
  }
}
