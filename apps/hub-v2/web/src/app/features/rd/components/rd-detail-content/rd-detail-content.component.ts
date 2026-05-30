import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { MarkdownViewerComponent, PanelCardComponent } from '@shared/ui';
import type { IssueEntity } from '../../../issues/models/issue.model';
import { resolveRdStageName, type RdItemEntity, type RdLogEntity, type RdStageEntity, type RdStageHistoryEntry, type RdStageTaskEntity } from '../../models/rd.model';
import { RdActivityTimelineComponent } from '../rd-activity-timeline/rd-activity-timeline.component';
import { RdDetailNoteComponent } from '../rd-detail-note/rd-detail-note.component';
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
    RdDetailNoteComponent,
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
            [canCreateStageTask]="canCreateStageTask()"
            (actionClick)="actionClick.emit($event)"
            (editClick)="editRequest.emit()"
            (createStageTaskClick)="createStageTaskClick.emit()"
          />
        }
        @if (showSummary()) {
          <app-panel-card title="研发项描述">
            <div class="summary-card">
              <div class="summary-card__scroll">
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
                  <app-rd-detail-note [label]="note.label" [content]="note.content" />
                }
              </div>
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
        padding: 0;
      }
      .summary-card__scroll {
        max-height: min(560px, 62vh);
        overflow-y: auto;
        padding: 20px;
        overscroll-behavior: contain;
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
  readonly stageTasks = input<RdStageTaskEntity[]>([]);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canComplete = input(false);
  readonly canAccept = input(false);
  readonly canClose = input(false);
  readonly canCreateStageTask = input(false);
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
    const notes: Array<{ id: string; label: string; content: string; createdAt: string }> = [];

    for (const log of this.logs()) {
      const content = log.content?.trim() || '';
      if (!content) {
        continue;
      }

      if (log.actionType === 'advance_stage') {
        const meta = this.parseLogMeta(log.metaJson);
        const descFromMeta = typeof meta?.['description'] === 'string' ? meta['description'].trim() : '';
        const descMatch = content.match(/(?:^|；)\s*说明[:：]\s*(.+)$/);
        const desc = descFromMeta || descMatch?.[1]?.trim() || '暂无阶段说明。';
        const stageName = this.readMetaString(meta, 'stageName') || this.parseAdvanceStageName(content);
        const planText = this.formatPlanRange(this.readMetaString(meta, 'planStartAt'), this.readMetaString(meta, 'planEndAt')) || this.parseAdvancePlanText(content);
        const ownerText = this.readMetaStringArray(meta, 'memberNames').join('、') || this.parseAdvanceMemberText(content);
        notes.push({
          id: `advance-${log.id}`,
          label: this.buildNoteLabel([stageName || '阶段描述', planText, ownerText]),
          content: desc,
          createdAt: log.createdAt,
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
          createdAt: log.createdAt,
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
          createdAt: log.createdAt,
        });
      }
    }

    for (const task of this.stageTasks()) {
      const description = task.description?.trim();
      if (!description || task.status === 'cancelled') {
        continue;
      }
      const stageName = this.stageNameByTask(task);
      const ownerText = task.ownerNames.map((name) => name.trim()).filter(Boolean).join('、');
      const planText = this.formatStageTaskPlanRange(task);
      notes.push({
        id: `stage-task-${task.id}`,
        label: this.buildNoteLabel([stageName, planText, ownerText]),
        content: [`**${task.title}**`, description].join('\n'),
        createdAt: task.createdAt,
      });
    }

    return notes
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(({ createdAt, ...note }) => note);
  });
  readonly actionClick = output<'advance' | 'complete' | 'accept' | 'close' | 'reopen'>();
  readonly editRequest = output<void>();
  readonly createStageTaskClick = output<void>();
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

  private stageNameByTask(task: RdStageTaskEntity): string {
    const matchedStage = this.stages().find((stage) => resolveRdStageName(task.stageKey) === stage.name || stage.id === task.stageKey);
    return matchedStage?.name || resolveRdStageName(task.stageKey);
  }

  private formatStageTaskPlanRange(task: RdStageTaskEntity): string {
    return this.formatPlanRange(task.plannedStartAt, task.plannedEndAt);
  }

  private formatPlanRange(start: string | null | undefined, end: string | null | undefined): string {
    const planStart = start?.trim();
    const planEnd = end?.trim();
    if (planStart && planEnd) {
      return `${planStart} ~ ${planEnd}`;
    }
    return planStart || planEnd || '';
  }

  private buildNoteLabel(parts: Array<string | null | undefined>): string {
    return parts.map((part) => part?.trim()).filter((part): part is string => !!part).join(' · ');
  }

  private parseLogMeta(metaJson: string | null): Record<string, unknown> | null {
    if (!metaJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(metaJson) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }

  private readMetaString(meta: Record<string, unknown> | null, key: string): string {
    const value = meta?.[key];
    return typeof value === 'string' ? value.trim() : '';
  }

  private readMetaStringArray(meta: Record<string, unknown> | null, key: string): string[] {
    const value = meta?.[key];
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean);
  }

  private parseAdvanceStageName(content: string): string {
    const stageMatch = content.match(/推进阶段[:：]\s*.+?\s*->\s*([^；]+)/);
    return stageMatch?.[1]?.trim() || '';
  }

  private parseAdvanceMemberText(content: string): string {
    const memberMatch = content.match(/(?:^|；)\s*成员[:：]\s*([^；]+)/);
    const members = memberMatch?.[1]?.trim();
    return members && members !== '未指定' ? members : '';
  }

  private parseAdvancePlanText(content: string): string {
    const planMatch = content.match(/(?:^|；)\s*计划[:：]\s*([^；]+)/);
    return planMatch?.[1]?.trim() || '';
  }
}
