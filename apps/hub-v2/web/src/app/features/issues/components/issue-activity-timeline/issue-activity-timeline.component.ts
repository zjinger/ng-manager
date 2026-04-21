import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PanelCardComponent } from '@shared/ui';
import { IssueDetailNoteComponent } from '../issue-detail-note/issue-detail-note.component';
import type { IssueLogEntity } from '../../models/issue.model';

interface IssueTimelineItem {
  id: string;
  icon: string;
  actionType: string;
  actor: string;
  action: string;
  actionSegments?: Array<{ text: string; mention?: boolean }>;
  time: string;
}

@Component({
  selector: 'app-issue-activity-timeline',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzSelectModule, PanelCardComponent, IssueDetailNoteComponent],
  template: `
    <app-panel-card [title]="'活动记录'" [empty]="filteredTimelineItems().length === 0" [emptyText]="'暂无操作记录'">
      @if (showFilter()) {
        <div panel-actions class="timeline-filter">
          <label class="timeline-filter__label">筛选</label>
          <nz-select
            class="timeline-filter__select"
            nzSize="small"
            [ngModel]="selectedFilter()"
            (ngModelChange)="onFilterModelChange($event)"
            [nzDropdownMatchSelectWidth]="false"
          >
            @for (opt of filterOptions(); track opt.value) {
              <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
            }
          </nz-select>
        </div>
      }
      <div class="timeline">
        @for (item of filteredTimelineItems(); track item.id) {
          <div class="timeline-log">
            <span nz-icon [nzType]="item.icon" class="timeline-log__icon"></span>
            <div class="timeline-log__body">
              <app-issue-detail-note [variant]="'timeline'">
                <span class="timeline-log__user">{{ item.actor }}</span>
                <span class="timeline-log__action">
                  @if (item.actionSegments?.length) {
                    @for (segment of item.actionSegments!; track $index) {
                      @if (segment.mention) {
                        <span class="timeline-log__mention">{{ segment.text }}</span>
                      } @else {
                        <span>{{ segment.text }}</span>
                      }
                    }
                  } @else {
                    {{ item.action }}
                  }
                </span>
              </app-issue-detail-note>
            </div>
            <span class="timeline-log__time">{{ item.time }}</span>
          </div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .timeline {
        display: grid;
        max-height: 560px;
        overflow: auto;
      }

      .timeline-filter__label {
        color: var(--text-muted);
        font-size: 12px;
      }

      .timeline-filter {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .timeline-filter__select {
        min-width: 132px;
        height: auto;
      }

      .timeline-log {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 14px 20px;
        border-top: 1px solid var(--border-color-soft);
        font-size: 13px;
      }

      .timeline-log__icon,
      .timeline-log__time {
        flex: 0 0 auto;
      }

      .timeline-log__icon {
        margin-top: 2px;
        color: var(--primary-500);
        font-size: 13px;
      }

      .timeline-log__body {
        min-width: 0;
        flex: 1 1 auto;
      }

      .timeline-log__user {
        margin-right: 6px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .timeline-log__action {
        white-space: pre-wrap;
        word-break: break-word;
      }

      .timeline-log__mention {
        color: var(--primary-700);
        font-weight: 600;
      }

      .timeline-log__time {
        margin-left: auto;
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.6;
      }

      @media (max-width: 768px) {
        .timeline {
          max-height: 52vh;
        }

        .timeline-log {
          flex-wrap: wrap;
        }

        .timeline-log__body {
          flex-basis: calc(100% - 21px);
        }

        .timeline-log__time {
          width: 100%;
          margin-left: 21px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueActivityTimelineComponent {
  private readonly mentionPattern = /(@[^\s@,，.。;；:：!?！？]+)/g;
  readonly selectedFilter = signal<string>('all');

  readonly logs = input.required<IssueLogEntity[]>();
  readonly showFilter = computed(() => this.logs().length > 10);
  readonly timelineItems = computed<IssueTimelineItem[]>(() =>
    this.logs().map((item) => {
      const action = this.logText(item);

      return {
        id: item.id,
        icon: this.iconType(item),
        actionType: item.actionType,
        actor: item.operatorName || '系统',
        action,
        actionSegments: this.highlightMentionSegments(action),
        time: new Intl.DateTimeFormat('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(item.createdAt)),
      };
    }),
  );
  readonly filterOptions = computed(() => {
    const uniqueActionTypes = Array.from(
      new Set(this.timelineItems().map((item) => item.actionType).filter((type) => !!type?.trim())),
    );
    return [
      { value: 'all', label: '全部' },
      ...uniqueActionTypes.map((type) => ({ value: type, label: this.actionTypeLabel(type) })),
    ];
  });
  readonly filteredTimelineItems = computed(() => {
    const selected = this.selectedFilter();
    const all = this.timelineItems();
    const hasSelected = this.filterOptions().some((item) => item.value === selected);
    if (selected === 'all' || !hasSelected) {
      return all;
    }
    return all.filter((item) => item.actionType === selected);
  });

  onFilterModelChange(value: string): void {
    const next = value?.trim() || 'all';
    const hasOption = this.filterOptions().some((item) => item.value === next);
    this.selectedFilter.set(hasOption ? next : 'all');
  }

  private iconType(item: IssueLogEntity): string {
    const metaKind = this.readMetaKind(item.metaJson);
    if (metaKind === 'participant.added' || metaKind === 'participant.added.batch') {
      return 'user-add';
    }
    if (metaKind === 'participant.removed') {
      return 'user-delete';
    }
    if (metaKind === 'issue_branch.created' || metaKind === 'issue_branch.claimed') {
      return 'share-alt';
    }
    if (metaKind === 'issue_branch.started') {
      return 'play-circle';
    }
    if (metaKind === 'issue_branch.completed') {
      return 'check-circle';
    }

    return (
      {
        create: 'plus-circle',
        urge: 'bell',
        assign: 'user-add',
        claim: 'user-add',
        start: 'play-circle',
        wait_update: 'clock-circle',
        resolve: 'check-circle',
        verify: 'safety-certificate',
        reopen: 'redo',
        close: 'close-circle',
        comment: 'message',
        update: 'edit',
      }[item.actionType] || 'clock-circle'
    );
  }

  private logText(item: IssueLogEntity): string {
    const reason = this.readMetaReason(item.metaJson);
    if (item.actionType === 'resolve' && reason) {
      return `标记问题已解决：${reason}`;
    }
    if (item.actionType === 'reopen' && reason) {
      return `重新打开问题：${reason}`;
    }
    if (item.actionType === 'close' && reason) {
      return `关闭问题：${reason}`;
    }
    return item.summary || item.actionType;
  }

  private actionTypeLabel(actionType: string): string {
    return (
      {
        create: '创建',
        urge: '置顶提醒',
        assign: '指派',
        claim: '认领',
        start: '开始处理',
        wait_update: '待提测',
        resolve: '标记解决',
        verify: '验证通过',
        reopen: '重新打开',
        close: '关闭',
        comment: '评论',
        update: '更新',
      }[actionType] || actionType
    );
  }

  private highlightMentionSegments(text: string): Array<{ text: string; mention?: boolean }> | undefined {
    if (!text || !text.includes('@')) {
      return undefined;
    }
    const parts = text.split(this.mentionPattern).filter((part) => part.length > 0);
    if (parts.length <= 1) {
      return undefined;
    }
    return parts.map((part) => ({
      text: part,
      mention: part.startsWith('@'),
    }));
  }

  private readMetaKind(metaJson: string | null): string | null {
    const parsed = this.parseMeta(metaJson);
    return typeof parsed?.['kind'] === 'string' ? parsed['kind'] : null;
  }

  private readMetaReason(metaJson: string | null): string | null {
    const parsed = this.parseMeta(metaJson);
    if (!parsed) {
      return null;
    }
    const reason = typeof parsed['reason'] === 'string' ? parsed['reason'].trim() : '';
    return reason || null;
  }

  private parseMeta(metaJson: string | null): Record<string, unknown> | null {
    if (!metaJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(metaJson) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
}
