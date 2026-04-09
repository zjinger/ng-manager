import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, QueryList, ViewChildren, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PanelCardComponent } from '@shared/ui';
import type { IssueLogEntity } from '../../models/issue.model';

interface IssueTimelineItem {
  id: string;
  icon: string;
  actor: string;
  action: string;
  actionSegments?: Array<{ text: string; mention?: boolean }>;
  time: string;
  isComment: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-issue-activity-timeline',
  standalone: true,
  imports: [NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card [title]="'活动记录'" [empty]="timelineItems().length === 0" [emptyText]="'暂无操作记录'">
      <div class="timeline">
        @for (item of timelineItems(); track item.id) {
          <div class="timeline-log">
            <span nz-icon [nzType]="item.icon" class="timeline-log__icon"></span>
            <div class="timeline-log__body">
              <div
                #summaryText
                class="timeline-log__summary"
                [class.is-collapsed]="item.isComment && isOverflowing(item.id) && !item.expanded"
                [attr.data-log-id]="item.id"
                [attr.data-is-comment]="item.isComment"
              >
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
              </div>
              @if (item.isComment && isOverflowing(item.id)) {
                <button type="button" class="timeline-log__toggle timeline-log__toggle--block" (click)="toggleExpanded(item.id)">
                  {{ item.expanded ? '收起' : '展开' }}
                </button>
              }
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

      .timeline-log__summary {
        position: relative;
        min-width: 0;
        color: var(--text-secondary);
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
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

      .timeline-log__summary.is-collapsed {
        max-height: calc(1.7em * 2);
        overflow: hidden;
      }

      .timeline-log__summary.is-collapsed::after {
        content: '......';
        position: absolute;
        right: 0;
        bottom: 0;
        padding-left: 10px;
        background: linear-gradient(90deg, transparent, var(--bg-container) 40%);
      }

      .timeline-log__mention {
        color: var(--primary-700);
        font-weight: 600;
      }

      .timeline-log__toggle {
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .timeline-log__toggle--block {
        display: inline-flex;
        align-items: center;
        margin-top: 6px;
      }

      .timeline-log__toggle:hover {
        color: var(--primary-700);
      }

      .timeline-log__time {
        margin-left: auto;
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.6;
      }

      :host-context(html[data-theme='dark']) .timeline-log__summary.is-collapsed::after {
        background: linear-gradient(90deg, transparent, var(--bg-container) 34%);
      }

      @media (max-width: 768px) {
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
export class IssueActivityTimelineComponent implements AfterViewInit {
  private readonly mentionPattern = /(@[^\s@,，.。;；:：!?！？]+)/g;
  private readonly destroyRef = inject(DestroyRef);
  private readonly expandedLogIds = signal<ReadonlySet<string>>(new Set());
  private readonly overflowingLogIds = signal<ReadonlySet<string>>(new Set());

  @ViewChildren('summaryText')
  private readonly summaryElements?: QueryList<ElementRef<HTMLElement>>;

  readonly logs = input.required<IssueLogEntity[]>();
  readonly timelineItems = computed<IssueTimelineItem[]>(() =>
    this.logs().map((item) => {
      const action = this.logText(item);
      const isComment = item.actionType === 'comment';
      const expanded = isComment && this.expandedLogIds().has(item.id);

      return {
        id: item.id,
        icon: this.iconType(item),
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
        isComment,
        expanded,
      };
    }),
  );

  constructor() {
    effect(() => {
      this.logs();
      this.expandedLogIds();
      this.scheduleOverflowMeasure();
    });
  }

  ngAfterViewInit(): void {
    this.scheduleOverflowMeasure();
    this.summaryElements?.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.scheduleOverflowMeasure();
    });
  }

  toggleExpanded(logId: string): void {
    this.expandedLogIds.update((current) => {
      const next = new Set(current);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }

  isOverflowing(logId: string): boolean {
    return this.overflowingLogIds().has(logId);
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
    return item.summary || item.actionType;
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
    if (!metaJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(metaJson) as { kind?: unknown };
      return typeof parsed.kind === 'string' ? parsed.kind : null;
    } catch {
      return null;
    }
  }

  private scheduleOverflowMeasure(): void {
    queueMicrotask(() => this.measureOverflowingComments());
  }

  private measureOverflowingComments(): void {
    const elements = this.summaryElements?.toArray() ?? [];
    if (elements.length === 0) {
      if (this.overflowingLogIds().size > 0) {
        this.overflowingLogIds.set(new Set());
      }
      return;
    }

    const next = new Set<string>();
    for (const item of elements) {
      const element = item.nativeElement;
      if (element.dataset['isComment'] !== 'true') {
        continue;
      }
      const logId = element.dataset['logId'];
      if (!logId) {
        continue;
      }
      const lineHeightValue = Number.parseFloat(getComputedStyle(element).lineHeight || '');
      const lineHeight = Number.isFinite(lineHeightValue) ? lineHeightValue : 20;
      if (element.scrollHeight > lineHeight * 2 + 2) {
        next.add(logId);
      }
    }

    if (!this.sameSet(this.overflowingLogIds(), next)) {
      this.overflowingLogIds.set(next);
    }
  }

  private sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    if (left.size !== right.size) {
      return false;
    }
    for (const item of left) {
      if (!right.has(item)) {
        return false;
      }
    }
    return true;
  }
}
