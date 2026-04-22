import { CommonModule, } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { map } from 'rxjs';

import { ISSUE_TITLE_BY_TYPE } from '@app/shared/constants';
import { ProjectContextStore } from '@core/state';
import { ListStateComponent, MarkdownViewerComponent, SideDetailLayoutComponent } from '@shared/ui';
import { IssueActivityTimelineComponent } from '../../components/issue-activity-timeline/issue-activity-timeline.component';
import { IssueAttachmentsPanelComponent } from '../../components/issue-attachments-panel/issue-attachments-panel.component';
import { IssueBranchesPanelComponent } from '../../components/issue-branches-panel/issue-branches-panel.component';
import { IssueCollaboratorsPanelComponent } from '../../components/issue-collaborators-panel/issue-collaborators-panel.component';
import { IssueCommentEditorComponent } from '../../components/issue-comment-editor/issue-comment-editor.component';
import { IssueDetailHeaderComponent } from '../../components/issue-detail-header/issue-detail-header.component';
import { IssueDetailNoteComponent } from '../../components/issue-detail-note/issue-detail-note.component';
import { IssuePropsPanelComponent } from '../../components/issue-props-panel/issue-props-panel.component';
import { IssueAddParticipantsDialogComponent } from '../../dialogs/issue-add-participants-dialog/issue-add-participants-dialog.component';
import { IssueAssignDialogComponent } from '../../dialogs/issue-assign-dialog/issue-assign-dialog.component';
import { IssueCreateBranchDialogComponent } from '../../dialogs/issue-create-branch-dialog/issue-create-branch-dialog.component';
import { IssueEditDialogComponent } from '../../dialogs/issue-edit-dialog/issue-edit-dialog.component';
import { IssueStartOwnBranchDialogComponent } from '../../dialogs/issue-start-own-branch-dialog/issue-start-own-branch-dialog.component';
import { IssueTransitionDialogComponent } from '../../dialogs/issue-transition-dialog/issue-transition-dialog.component';
import { IssueEntity, UpdateIssueInput } from '../../models/issue.model';
import { IssueDetailStore } from '../../store/issue-detail.store';

@Component({
  selector: 'app-issue-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    SideDetailLayoutComponent,
    IssueActivityTimelineComponent,
    IssueAttachmentsPanelComponent,
    IssueBranchesPanelComponent,
    IssueCommentEditorComponent,
    IssueCollaboratorsPanelComponent,
    IssueDetailHeaderComponent,
    IssueDetailNoteComponent,
    IssuePropsPanelComponent,
    IssueAssignDialogComponent,
    IssueAddParticipantsDialogComponent,
    IssueCreateBranchDialogComponent,
    IssueEditDialogComponent,
    IssueStartOwnBranchDialogComponent,
    IssueTransitionDialogComponent,
    MarkdownViewerComponent,
    ListStateComponent,
  ],
  providers: [IssueDetailStore],
  template: `
    <div class="detail-page" [class.is-embedded]="embedded()">
      @if (!embedded()) {
        <a class="back-link" [routerLink]="['/issues']">
          <span nz-icon nzType="arrow-left" class="back-link__icon"></span>
          返回列表
        </a>
      }

      <app-list-state
        [loading]="store.loading()"
        [empty]="!store.loading() && !store.issue()"
        loadingText="正在加载测试单详情…"
        emptyTitle="未找到对应测试单"
        emptyDescription="该测试单可能已删除或你无访问权限。"
      >
        @if (store.issue();as issue) {
          <section class="detail-stack">
            <app-side-detail-layout [staticSide]="embedded()">
              <div detail-main class="detail-main">
                  
                <app-issue-detail-header
                  [issue]="issue"
                  [projectName]="projectName(issue.projectId)"
                  [logs]="store.logs()"
                  [canStart]="store.canStart()"
                  [startActionLabel]="store.startActionLabel()"
                  [canClaim]="store.canClaim()"
                  [canAssign]="store.canAssign()"
                  [assignActionLabel]="store.assignActionLabel()"
                  [canEdit]="store.canEdit()"
                  [canManageParticipants]="store.canManageParticipants()"
                  [canWaitForUpdate]="store.canWaitForUpdate()"
                  [canResolve]="store.canResolve()"
                  [canVerify]="store.canVerify()"
                  [canReopen]="store.canReopen()"
                  [canClose]="store.canClose()"
                  [branchSummaryText]="store.branchSummaryText()"
                  (start)="confirmStart()"
                  (waitForUpdate)="confirmWaitForUpdate()"
                  (claim)="confirmClaim()"
                  (assign)="assignIssue()"
                  (edit)="openEdit()"
                  (addParticipants)="openAddParticipants()"
                  (resolve)="resolveIssue()"
                  (verify)="store.verify()"
                  (reopen)="reopenIssue()"
                  (close)="confirmClose()"
                />

                <section class="description-card">
                  <h3>{{ getIssueTitleByType(issue) }}</h3>
                  @if (issue.description) {
                    <app-markdown-viewer [content]="issue.description" [showToc]="true"></app-markdown-viewer>
                  } @else {
                    暂无描述
                  }
                  @if (issue.resolutionSummary) {
                    <app-issue-detail-note [label]="store.resolveAt() ? ('已解决说明 · ' + (store.resolveAt() | date: 'MM-dd HH:mm')) : '已解决说明'" [content]="issue.resolutionSummary" />
                  }
                  @if (store.reopenReason()) {
                    <app-issue-detail-note [label]="store.reopenAt() ? ('重开原因 · ' + (store.reopenAt() | date: 'MM-dd HH:mm')) : '重开原因'" [content]="store.reopenReason()!" />
                  }
                  @if (issue.closeReason) {
                    <app-issue-detail-note [label]="store.closeAt() ? ('关闭原因 · ' + (store.closeAt() | date: 'MM-dd HH:mm')) : '关闭原因'" [content]="issue.closeReason" />
                  }
                </section>

                <app-issue-comment-editor
                  [comments]="store.comments()"
                  [members]="store.members()"
                  [busy]="store.busy()"
                  (submit)="store.postComment($event.content, $event.mentions)"
                />
                <app-issue-activity-timeline [logs]="store.logs()" />
              </div>

              <div detail-side class="detail-side">
                <app-issue-props-panel [issue]="issue" [participants]="store.participants()" />
                <app-issue-branches-panel
                  [branches]="store.branches()"
                  [currentActorIds]="store.currentActorIds()"
                  [summaryText]="store.branchSummaryText()"
                  [canCreate]="store.canCreateBranches()"
                  [canStartActions]="store.canStartBranchActions()"
                  [canStartOwn]="store.canStartOwnBranch()"
                  [busy]="store.busy()"
                  (create)="openCreateBranch()"
                  (startOwn)="openStartOwnBranch()"
                  (startBranch)="store.startBranch($event)"
                  (completeBranch)="store.completeBranch($event)"
                />
                <app-issue-collaborators-panel
                  [issue]="issue"
                  [participants]="store.participants()"
                  [members]="store.members()"
                  [availableMembers]="store.availableMembers()"
                  [canAssign]="store.canAssign()"
                  [canManageParticipants]="store.canManageParticipants()"
                  [busy]="store.busy()"
                  (assign)="store.assign($event)"
                  (removeParticipant)="store.removeParticipant($event)"
                />
                <app-issue-attachments-panel
                  [attachments]="store.attachments()"
                  [members]="store.members()"
                  [removableAttachmentIds]="store.removableAttachmentIds()"
                  [busy]="store.busy()"
                  (upload)="store.uploadAttachment($event)"
                  (remove)="store.removeAttachment($event)"
                />
              </div>
            </app-side-detail-layout>
          </section>
        }
      </app-list-state>

      <app-issue-assign-dialog
        [open]="assignOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [actionLabel]="store.assignActionLabel()"
        [members]="store.members()"
        (cancel)="assignOpen.set(false)"
        (confirm)="confirmAssign($event.assigneeId)"
      />

      <app-issue-transition-dialog
        [open]="resolveOpen()"
        [busy]="store.busy()"
        [mode]="'resolve'"
        [issue]="store.issue()"
        (cancel)="resolveOpen.set(false)"
        (confirm)="confirmResolve($event.content)"
      />

      <app-issue-transition-dialog
        [open]="reopenOpen()"
        [busy]="store.busy()"
        [mode]="'reopen'"
        [issue]="store.issue()"
        (cancel)="reopenOpen.set(false)"
        (confirm)="confirmReopen($event.content)"
      />

      <app-issue-transition-dialog
        [open]="closeOpen()"
        [busy]="store.busy()"
        [mode]="'close'"
        [reasonRequired]="closeReasonRequired()"
        [issue]="store.issue()"
        (cancel)="closeOpen.set(false)"
        (confirm)="confirmCloseWithReason($event.content)"
      />

      <app-issue-add-participants-dialog
        [open]="addParticipantsOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [members]="store.availableMembers()"
        (cancel)="addParticipantsOpen.set(false)"
        (confirm)="confirmAddParticipants($event.userIds)"
      />

      <app-issue-create-branch-dialog
        [open]="createBranchOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [participants]="store.participants()"
        (cancel)="createBranchOpen.set(false)"
        (confirm)="confirmCreateBranch($event)"
      />

      <app-issue-start-own-branch-dialog
        [open]="startOwnBranchOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        (cancel)="startOwnBranchOpen.set(false)"
        (confirm)="confirmStartOwnBranch($event.title)"
      />

      <app-issue-edit-dialog
        [open]="editOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [modules]="store.modules()"
        [versions]="store.versions()"
        [environments]="store.environments()"
        (cancel)="editOpen.set(false)"
        (confirm)="confirmEdit($event)"
      />
    </div>
  `,
  styles: [
    `
      .detail-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .detail-stack {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .detail-page.is-embedded {
        gap: 0;
      }
      .back-link {
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 999px;
        background: var(--surface-overlay);
        border: 1px solid var(--border-color);
        color: var(--primary-700);
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        backdrop-filter: blur(10px);
      }
      .state-card,
      .description-card {
        padding: 24px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 34%),
          var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 24px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }
      .description-card h3 {
        margin: 0 0 14px;
        color: var(--text-primary);
        font-size: 16px;
      }
      .description {
        color: var(--text-secondary);
        white-space: pre-wrap;
        line-height: 1.7;
      }
      .detail-main,
      .detail-side {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .detail-page.is-embedded .detail-stack {
        gap: 12px;
      }
      .detail-page.is-embedded .state-card,
      .detail-page.is-embedded .description-card {
        border-radius: 22px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
      }
      .detail-page.is-embedded .description-card {
        padding: 22px 24px;
      }
      :host-context(html[data-theme='dark']) .back-link,
      :host-context(html[data-theme='dark']) .state-card,
      :host-context(html[data-theme='dark']) .description-card {
        border-color: rgba(148, 163, 184, 0.14);
      }
      .back-link__icon {
        font-size: 12px;
      }
      @media (max-width: 768px) {
        .back-link {
          font-size: 13px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueDetailPageComponent {
  readonly store = inject(IssueDetailStore);
  readonly projectContext = inject(ProjectContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly modal = inject(NzModalService);
  readonly projectNameById = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const project of this.projectContext.projects()) {
      map[project.id] = project.name;
    }
    return map;
  });
  private readonly routeIssueId = toSignal(this.route.paramMap.pipe(map((params) => params.get('issueId'))), {
    initialValue: this.route.snapshot.paramMap.get('issueId'),
  });
  readonly issueId = input<string | null>(null);
  readonly embedded = input(false);
  readonly assignOpen = signal(false);
  readonly addParticipantsOpen = signal(false);
  readonly createBranchOpen = signal(false);
  readonly startOwnBranchOpen = signal(false);
  readonly resolveOpen = signal(false);
  readonly reopenOpen = signal(false);
  readonly closeOpen = signal(false);
  readonly editOpen = signal(false);
  readonly closeReasonRequired = signal(false);
  private readonly loadedIssueId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const issueId = this.issueId() ?? this.routeIssueId();
      if (!issueId || this.loadedIssueId() === issueId) {
        return;
      }
      this.loadedIssueId.set(issueId);
      this.store.load(issueId);
    });
  }

  resolveIssue(): void {
    this.resolveOpen.set(true);
  }

  reopenIssue(): void {
    this.reopenOpen.set(true);
  }

  assignIssue(): void {
    this.assignOpen.set(true);
  }

  openAddParticipants(): void {
    this.addParticipantsOpen.set(true);
  }

  openCreateBranch(): void {
    this.createBranchOpen.set(true);
  }

  openStartOwnBranch(): void {
    this.startOwnBranchOpen.set(true);
  }

  openEdit(): void {
    this.editOpen.set(true);
  }

  confirmStart(): void {
    this.modal.confirm({
      nzTitle: this.store.issue()?.status === 'pending_update' ? '确认继续处理该问题？' : '确认开始处理该问题？',
      nzContent:
        this.store.issue()?.status === 'pending_update'
          ? '继续处理后，状态将从“待提测”回到“处理中”。'
          : '开始处理后将进入处理流转，负责人可继续处理、转派或标记待提测。',
      nzOkText: this.store.issue()?.status === 'pending_update' ? '确认继续' : '确认开始',
      nzCancelText: '取消',
      nzOnOk: () => this.store.start(),
    });
  }

  confirmWaitForUpdate(): void {
    this.modal.confirm({
      nzTitle: '标记为待提测？',
      nzContent: '适用于代码已提交、等待测试验证的情况，方便后续单独筛选。',
      nzOkText: '确认标记',
      nzCancelText: '取消',
      nzOnOk: () => this.store.waitForUpdate(),
    });
  }

  confirmClaim(): void {
    this.modal.confirm({
      nzTitle: '确认认领该问题？',
      nzContent: '认领后你将成为负责人，可继续开始处理或转派。',
      nzOkText: '确认认领',
      nzCancelText: '取消',
      nzOnOk: () => this.store.claim(),
    });
  }

  confirmAssign(assigneeId: string): void {
    this.store.assign(assigneeId);
    this.assignOpen.set(false);
  }

  confirmAddParticipants(userIds: string[]): void {
    this.store.addParticipants(userIds);
    this.addParticipantsOpen.set(false);
  }

  confirmCreateBranch(input: { ownerUserId: string; title: string }): void {
    this.store.createBranch(input);
    this.createBranchOpen.set(false);
  }

  confirmStartOwnBranch(title: string): void {
    this.store.startOwnBranch({ title });
    this.startOwnBranchOpen.set(false);
  }

  confirmEdit(input: UpdateIssueInput): void {
    this.store.updateBasic(input);
    this.editOpen.set(false);
  }

  confirmResolve(summary: string): void {
    this.resolveOpen.set(false);
    const value = summary.trim();
    const pendingCount = this.store.pendingBranchCount();
    if (pendingCount > 0) {
      this.modal.confirm({
        nzTitle: `还有 ${pendingCount} 个未完成协作分支，仍要标记解决吗？`,
        nzContent: '协作分支不会自动关闭，主 issue 会按负责人操作继续进入待验证。',
        nzOkText: '仍然解决',
        nzCancelText: '取消',
        nzOnOk: () => this.store.resolve(value || undefined),
      });
      return;
    }
    this.store.resolve(value || undefined);
  }

  confirmReopen(remark: string): void {
    this.store.reopen(remark);
    this.reopenOpen.set(false);
  }

  confirmClose(): void {
    const issue = this.store.issue();
    if (!issue) {
      return;
    }

    if (issue.status === 'verified') {
      this.modal.confirm({
        nzTitle: '确认关闭该问题？',
        nzContent: '关闭后状态将变为“已关闭”，如需继续处理可重新打开。',
        nzOkText: '确认关闭',
        nzCancelText: '取消',
        nzOnOk: () => this.store.close(),
      });
      return;
    }

    this.closeReasonRequired.set(true);
    this.closeOpen.set(true);
  }

  confirmCloseWithReason(reason: string): void {
    const value = reason.trim();
    if (this.closeReasonRequired() && !value) {
      return;
    }
    this.store.close(value || undefined);
    this.closeOpen.set(false);
  }
  getIssueTitleByType(issue: IssueEntity): string {
    const item = ISSUE_TITLE_BY_TYPE.find((i) => i.type === issue.type);
    return item ? item.title : '问题描述';
  }

  projectName(projectId: string): string {
    return this.projectNameById()[projectId] || '未知项目';
  }
}
