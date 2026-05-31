import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { IssueEntity } from '../../../issues/models/issue.model';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { RdItemEntity, RdItemStageNoteEntity, RdLogEntity, RdMemberBlockEntity, RdStageEntity, RdStageHistoryEntry, RdStageTaskEntity, RdStageTaskStatus, RdStageTaskTemplateEntity } from '../../models/rd.model';
import { RdDetailContentComponent } from '../rd-detail-content/rd-detail-content.component';
import { RdProgressPanelComponent, type MemberProgressItem } from '../rd-progress-panel/rd-progress-panel.component';
import { RdStageTasksPanelComponent } from '../rd-stage-tasks-panel/rd-stage-tasks-panel.component';

@Component({
  selector: 'app-rd-detail-drawer',
  standalone: true,
  imports: [
    NzDrawerModule,
    NzIconModule,
    RdDetailContentComponent,
    RdProgressPanelComponent,
    RdStageTasksPanelComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="900"
      [nzWrapClassName]="'rd-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            @if (subtitleText(); as subtitle) {
              <span class="detail-drawer__subtitle">{{ subtitle }}</span>
            }
            <strong>{{ titleText() }}</strong>
          </div>
          <button type="button" class="detail-drawer__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        <div class="drawer-content">
          <div class="drawer-content__main">
            <app-rd-detail-content
              [busy]="busy()"
              [item]="item()"
              [logs]="logs()"
              [stages]="stages()"
              [stageNotes]="stageNotes()"
              [flowActionPlacement]="'below-flow'"
              [stageHistory]="stageHistory()"
              [memberProgressList]="memberProgressList()"
              [canEditBasic]="canEditBasic()"
              [canAdvance]="canAdvance()"
              [canComplete]="canComplete()"
              [canAccept]="canAccept()"
              [canClose]="canClose()"
              [canCreateStageTask]="canEditBasic()"
              [showSummary]="false"
              [showProps]="false"
              [showStageHistory]="false"
              [showActivity]="false"
              (actionClick)="actionClick.emit($event)"
              (editRequest)="editRequest.emit()"
              (createStageTaskClick)="requestCreateStageTask()"
            />
            @if (item(); as current) {
              <app-rd-progress-panel
                [item]="current"
                [memberProgressList]="memberProgressList()"
                [memberBlocks]="memberBlocks()"
                [stageTasks]="stageTasks()"
                [stages]="stages()"
                [canResolveMemberBlocks]="canResolveMemberBlocks()"
                [currentUserId]="currentUserId() || ''"
                (updateProgressClick)="updateProgressClick.emit($event)"
                (resolveMemberBlockClick)="resolveMemberBlockClick.emit($event)"
              />
              <app-rd-stage-tasks-panel
                [showList]="false"
                [showCreateButton]="false"
                [createDialogOpenRequest]="createStageTaskOpenRequest()"
                [stages]="stages()"
                [tasks]="stageTasks()"
                [members]="members()"
                [memberIds]="current.memberIds"
                [currentStageId]="current.stageId"
                [planStartAt]="current.planStartAt"
                [planEndAt]="current.planEndAt"
                [stageTaskTemplates]="stageTaskTemplates()"
                [canEdit]="canEditBasic()"
                (createTasks)="createStageTasks.emit($event)"
                (updateTask)="updateStageTask.emit($event)"
                (cancelTask)="cancelStageTask.emit($event)"
              />
            }
            <app-rd-detail-content
              [busy]="busy()"
              [item]="item()"
              [logs]="logs()"
              [stages]="stages()"
              [stageNotes]="stageNotes()"
              [stageTasks]="stageTasks()"
              [stageHistory]="stageHistory()"
              [memberProgressList]="memberProgressList()"
              [canEditBasic]="canEditBasic()"
              [canAdvance]="canAdvance()"
              [canComplete]="canComplete()"
              [canAccept]="canAccept()"
              [canClose]="canClose()"
              [showLinkedIssues]="true"
              [linkedIssues]="linkedIssues()"
              [linkedIssuesTotal]="linkedIssuesTotal()"
              [linkedIssuesLoading]="linkedIssuesLoading()"
              [showAction]="false"
              [showProps]="false"
              (loadMoreLinkedIssues)="loadMoreLinkedIssues.emit()"
              (actionClick)="actionClick.emit($event)"
              (editRequest)="editRequest.emit()"
            />
          </div>
          <div class="drawer-content__side">
            <app-rd-detail-content
              [busy]="busy()"
              [item]="item()"
              [logs]="logs()"
              [stages]="stages()"
              [stageNotes]="stageNotes()"
              [stageHistory]="stageHistory()"
              [memberProgressList]="memberProgressList()"
              [canEditBasic]="canEditBasic()"
              [canAdvance]="canAdvance()"
              [canComplete]="canComplete()"
              [canAccept]="canAccept()"
              [canClose]="canClose()"
              [showSummary]="false"
              [showActivity]="false"
              [showAction]="false"
              [showStageHistory]="false"
              (actionClick)="actionClick.emit($event)"
              (editRequest)="editRequest.emit()"
            />
          </div>
        </div>
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .detail-drawer__title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .detail-drawer__title-main {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .detail-drawer__title-main strong {
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.2;
      }
      .detail-drawer__subtitle {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.4;
        background: var(--gray-100);
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .detail-drawer__close {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 999px;
        transition: var(--transition-base);
      }
      .detail-drawer__close:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }
      .drawer-content {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 20px;
        padding: 20px;
      }
      .drawer-content__main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .drawer-content__side {
        min-width: 0;
      }
      @media (max-width: 900px) {
        .drawer-content {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailDrawerComponent {
  readonly createStageTaskOpenRequest = signal(0);

  readonly busy = input(false);
  readonly open = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly logs = input<RdLogEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly stageNotes = input<RdItemStageNoteEntity[]>([]);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly stageTasks = input<RdStageTaskEntity[]>([]);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);
  readonly linkedIssues = input<IssueEntity[]>([]);
  readonly linkedIssuesTotal = input(0);
  readonly linkedIssuesLoading = input(false);
  readonly canEditBasic = input(false);
  readonly canAdvance = input(false);
  readonly canComplete = input(false);
  readonly canAccept = input(false);
  readonly canClose = input(false);
  readonly memberProgressList = input<MemberProgressItem[]>([]);
  readonly memberBlocks = input<RdMemberBlockEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly canResolveMemberBlocks = input(false);
  readonly currentUserId = input<string>('');
  readonly actionClick = output<'advance' | 'complete' | 'accept' | 'close' | 'reopen'>();
  readonly editRequest = output<void>();
  readonly updateProgressClick = output<{ userId: string; memberName: string; currentProgress: number; quickStart?: boolean; stageTaskId?: string }>();
  readonly resolveMemberBlockClick = output<{ blockId: string }>();
  readonly createStageTasks = output<{
    tasks: Array<{
      stageKey: string;
      title: string;
      description?: string | null;
      ownerIds: string[];
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
    }>;
  }>();
  readonly updateStageTask = output<{ taskId: string; status: RdStageTaskStatus }>();
  readonly cancelStageTask = output<{ taskId: string }>();
  readonly loadMoreLinkedIssues = output<void>();
  readonly close = output<void>();

  readonly drawerBodyStyle = { padding: '0', overflow: 'auto' };
  readonly titleText = computed(() => this.item()?.title || '研发项详情');
  readonly subtitleText = computed(() => this.item()?.rdNo || '');

  requestCreateStageTask(): void {
    this.createStageTaskOpenRequest.update((value) => value + 1);
  }
}
