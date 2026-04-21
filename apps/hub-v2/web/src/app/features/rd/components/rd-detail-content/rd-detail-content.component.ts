import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { MarkdownViewerComponent, PanelCardComponent } from '@shared/ui';
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailContentComponent {
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly logs = input<RdLogEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canAccept = input(false);
  readonly canClose = input(false);
  readonly showSummary = input(true);
  readonly showAction = input(true);
  readonly flowActionPlacement = input<'top-right' | 'below-flow'>('top-right');
  readonly showProps = input(true);
  readonly showStageHistory = input(true);
  readonly showActivity = input(true);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly memberDisplayNames = computed(() => {
    const unique = new Set<string>();
    for (const item of this.memberProgressList()) {
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
      }
    }

    return notes;
  });
  readonly actionClick = output<'advance' | 'accept' | 'close' | 'reopen'>();
  readonly editRequest = output<void>();
  constructor() {}
}
