import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { MarkdownViewerComponent, PanelCardComponent } from '@shared/ui';
import type { IssueEntity } from '../../../issues/models/issue.model';
import { IssueDetailNoteComponent } from '../../../issues/components/issue-detail-note/issue-detail-note.component';
import type { RdItemEntity, RdLogEntity, RdStageEntity, RdStageHistoryEntry } from '../../models/rd.model';
import { RdActivityTimelineComponent } from '../rd-activity-timeline/rd-activity-timeline.component';
import { RdFlowCardComponent } from '../rd-flow-card/rd-flow-card.component';
import { RdPropsPanelComponent } from '../rd-props-panel/rd-props-panel.component';
import type { MemberProgressItem } from '../rd-progress-panel/rd-progress-panel.component';
import { RdStageHistoryPanelComponent } from '../rd-stage-history-panel/rd-stage-history-panel.component';

@Component({
  selector: 'app-rd-detail-content',
  standalone: true,
  imports: [
    NzButtonModule,
    DatePipe,
    PanelCardComponent,
    RdPropsPanelComponent,
    RdActivityTimelineComponent,
    RdFlowCardComponent,
    RdStageHistoryPanelComponent,
    MarkdownViewerComponent,
    IssueDetailNoteComponent,
  ],
  template: `
    @if (item(); as current) {
      <div class="detail-stack">
        @if (showAction()) {
          <app-rd-flow-card
            [item]="current"
            [stages]="stages()"
            [busy]="busy()"
            [actionPlacement]="flowActionPlacement()"
            [canEditBasic]="canEditBasic()"
            [canAdvance]="canAdvance()"
            [canComplete]="canComplete()"
            [canAccept]="canAccept()"
            [canClose]="canClose()"
            (actionClick)="actionClick.emit($event)"
            (editClick)="editRequest.emit()"
          />
        }
        @if (showSummary()) {
          <app-panel-card title="研发项描述">
          <div class="summary-card">
            @if (current.description) {
              <div class="summary-card__viewer">
                <app-markdown-viewer
                  [content]="current.description"
                  [showToc]="true"
                  [tocVariant]="'floating'"
                  [tocCollapsedByDefault]="true"
                ></app-markdown-viewer>
              </div>
            } @else {
              <p class="empty-hint">暂无描述</p>
            }
            @for (note of detailNotes(); track note.id) {
              <app-issue-detail-note [label]="note.label" [content]="note.content" />
            }
          </div>
          </app-panel-card>
        }
        @if (showProps()) {
          <app-rd-props-panel
            [item]="current"
            [stages]="stages()"
            [memberNames]="memberDisplayNames()"
            [stageHistory]="stageHistory()"
          />
        }
        @if (showLinkedIssues()) {
          <app-panel-card title="关联测试单" [empty]="linkedIssues().length === 0" [emptyText]="'暂无关联测试单'">
            <div class="linked-issues" (scroll)="onLinkedIssuesScroll($event)">
              @for (issue of linkedIssues(); track issue.id) {
                <button type="button" class="linked-issues__item" (click)="openIssue(issue.id)">
                  <div class="linked-issues__main">
                    <span class="linked-issues__no">{{ issue.issueNo }}</span>
                    <span class="linked-issues__title">{{ issue.title }}</span>
                  </div>
                  <span class="linked-issues__meta">{{ issue.updatedAt | date: 'MM-dd HH:mm' }}</span>
                </button>
              }
              @if (linkedIssuesHasMore() || linkedIssuesLoading()) {
                <button
                  nz-button
                  type="button"
                  class="linked-issues__load-state"
                  [disabled]="linkedIssuesLoading()"
                  [nzLoading]="linkedIssuesLoading()"
                  (click)="loadMoreLinkedIssues.emit()"
                >
                  {{ linkedIssuesLoading() ? '正在加载更多测试单…' : '加载更多测试单' }}
                </button>
              }
            </div>
          </app-panel-card>
        }
        
        @if (showActivity()) {
          <app-rd-activity-timeline [item]="current" [logs]="logs()" />
        }
        @if (showStageHistory()) {
          <app-rd-stage-history-panel [entries]="stageHistory()"></app-rd-stage-history-panel>
        }
      </div>
    }
  `,
  styles: [
    `
      .detail-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .summary-card {
        padding: 20px;
      }
      .summary-card p {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.7;
        white-space: pre-wrap;
      }
      .summary-card__viewer {
        max-height: 420px;
        overflow: auto;
        padding-right: 4px;
      }
      .summary-card .empty-hint {
        color: var(--text-muted);
        font-size: 13px;
      }
      .linked-issues {
        display: grid;
        max-height: 460px;
        overflow-y: auto;
      }
      .linked-issues__item {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 20px;
        border: 0;
        border-top: 1px solid var(--border-color-soft);
        background: transparent;
        cursor: pointer;
        text-align: left;
      }
      .linked-issues__item:hover {
        background: var(--bg-subtle);
      }
      .linked-issues__main {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .linked-issues__no {
        font-family: 'SF Mono', 'Fira Code', monospace;
        color: var(--primary-700);
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .linked-issues__title {
        color: var(--text-primary);
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .linked-issues__meta {
        color: var(--text-muted);
        font-size: 12px;
        flex-shrink: 0;
      }
      .linked-issues__load-state {
        width: calc(100% - 40px);
        margin: 10px 20px;
        padding: 10px 20px;
        color: var(--text-muted);
        font-size: 12px;
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailContentComponent {
  private readonly router = inject(Router);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly logs = input<RdLogEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canComplete = input(false);
  readonly canAccept = input(false);
  readonly canClose = input(false);
  readonly showSummary = input(true);
  readonly showAction = input(true);
  readonly flowActionPlacement = input<'top-right' | 'below-flow'>('top-right');
  readonly showProps = input(true);
  readonly showStageHistory = input(true);
  readonly showActivity = input(true);
  readonly showLinkedIssues = input(false);
  readonly linkedIssues = input<IssueEntity[]>([]);
  readonly linkedIssuesTotal = input(0);
  readonly linkedIssuesLoading = input(false);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly linkedIssuesHasMore = computed(() => this.linkedIssues().length < this.linkedIssuesTotal());
  readonly memberDisplayNames = computed(() => {
    const unique = new Set<string>();
    for (const item of this.memberProgressList()) {
      if (!item.isActiveMember) {
        continue;
      }
      const name = item.memberName?.trim();
      if (name) {
        unique.add(name);
      }
    }
    return Array.from(unique);
  });
  readonly detailNotes = computed(() => {
    const logs = [...this.logs()].reverse();
    const notes: Array<{ id: string; label: string; content: string }> = [];

    for (const log of logs) {
      const content = log.content?.trim() || '';
      if (!content) {
        continue;
      }

      if (log.actionType === 'advance_stage') {
        const descMatch = content.match(/(?:^|；)\s*说明[:：]\s*(.+)$/);
        const desc = descMatch?.[1]?.trim();
        if (!desc) {
          continue;
        }
        const stageMatch = content.match(/推进阶段[:：]\s*.+?\s*->\s*([^；]+)/);
        const stageName = stageMatch?.[1]?.trim() || '该';
        notes.push({
          id: `advance-${log.id}`,
          label: `${stageName}阶段描述`,
          content: desc,
        });
        continue;
      }

      if (log.actionType === 'close') {
        const reasonMatch = content.match(/关闭研发项[:：]\s*(.+)$/);
        const reason = reasonMatch?.[1]?.trim();
        if (!reason) {
          continue;
        }
        notes.push({
          id: `close-${log.id}`,
          label: '关闭原因',
          content: reason,
        });
        continue;
      }

      if (log.actionType === 'complete') {
        const reasonMatch = content.match(/(?:^|；)\s*说明[:：]\s*(.+?)(?:；\s*成员进度[:：]|$)/);
        const reason = reasonMatch?.[1]?.trim();
        if (!reason) {
          continue;
        }
        notes.push({
          id: `complete-${log.id}`,
          label: '完成判定依据',
          content: reason,
        });
      }
    }

    return notes;
  });
  readonly actionClick = output<'advance' | 'complete' | 'accept' | 'close' | 'reopen'>();
  readonly editRequest = output<void>();
  readonly loadMoreLinkedIssues = output<void>();
  constructor() {}

  openIssue(issueId: string): void {
    this.router.navigate(['/issues', issueId]);
  }

  onLinkedIssuesScroll(event: Event): void {
    if (!this.linkedIssuesHasMore() || this.linkedIssuesLoading()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= 48) {
      this.loadMoreLinkedIssues.emit();
    }
  }
}
