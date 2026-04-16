import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { IssueAddParticipantsDialogComponent } from '../dialogs/issue-add-participants-dialog.component';
import { IssueAssignDialogComponent } from '../dialogs/issue-assign-dialog.component';
import { IssueCloseDialogComponent } from '../dialogs/issue-close-dialog.component';
import { IssueCreateBranchDialogComponent } from '../dialogs/issue-create-branch-dialog.component';
import { IssueResolveDialogComponent } from '../dialogs/issue-resolve-dialog.component';
import { IssueStartOwnBranchDialogComponent } from '../dialogs/issue-start-own-branch-dialog.component';
import { AddParticipantsInput, AssignIssueInput, IssueActionType } from '../models/issue.model';
import { IssueDetailStore } from '../store/issue-detail.store';
import { IssueActionAreaComponent } from './issue-action-area/issue-action-area.component';
import { IssueAttachmentAreaComponent } from './issue-attachment-area/issue-attachment-area.component';
import { IssueBaseInfoAreaComponent } from './issue-base-info-area/issue-base-info-area.component';
import { IssueBranchesComponent } from './issue-branches/issue-branches.component';
import { IssueCollaboratorsAreaComponent } from './issue-collaborators-area/issue-collaborators-panel.component';
import { IssueCommentAreaComponent } from './issue-comment-area/issue-comment-editor.component';
import { IssueDescriptionAreaComponent } from './issue-description-area/issue-description-area.component';

@Component({
  selector: 'app-issue-detail',
  imports: [
    NzDrawerModule,
    NzEmptyModule,
    IssueActionAreaComponent,
    IssueCollaboratorsAreaComponent,
    IssueCommentAreaComponent,
    IssueAttachmentAreaComponent,
    IssueBaseInfoAreaComponent,
    IssueDescriptionAreaComponent,
    IssueBranchesComponent,
    IssueStartOwnBranchDialogComponent,
    IssueCreateBranchDialogComponent,
    IssueCloseDialogComponent,
    IssueResolveDialogComponent,
    IssueAssignDialogComponent,
    IssueAddParticipantsDialogComponent,
    CommonModule,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="true"
      [nzMaskClosable]="true"
      [nzWidth]="900"
      [nzWrapClassName]="'rd-detail-drawer'"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="closeDetaile()"
    >
      <ng-template #drawerTitleTpl>
        <div class="title-wrap">
          <div class="title-main">
            @if (subtitleText(); as subtitle) {
              <span class="subtitle">{{ subtitle }}</span>
            }
            <strong>{{ titleText() }}</strong>
          </div>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (store.canRead()) {
          <nz-empty [nzNotFoundContent]="'您没有权限查看该问题详情'"></nz-empty>
        } @else if (!store.issue()) {
          <nz-empty [nzNotFoundContent]="'正在加载测试单详情…'"></nz-empty>
        } @else if (store.issue(); as issue) {
          <div class="detail-wrap">
            <div class="detail-header">
              <!-- 操作 -->
              <app-issue-action-area
                [issue]="issue"
                [logs]="store.logs()"
                (actionClick)="handleActions($event)"
                [canStart]="store.canStart()"
                [canClaim]="store.canClaim()"
                [canAssign]="store.canAssign()"
                [assignActionLabel]="store.assignActionLabel()"
                [startActionLabel]="store.startActionLabel()"
                [canManageParticipants]="store.canManageParticipants()"
                [canPendingUpdate]="store.canPendingUpdate()"
                [canResolve]="store.canResolve()"
                [canVerify]="store.canVerify()"
                [canReopen]="store.canReopen()"
                [canClose]="store.canClose()"
              ></app-issue-action-area>
            </div>
            <div class="detail-content">
              <div class="left-column">
                <!-- 详情 -->
                <app-issue-description-area
                  [issue]="issue"
                  [projectId]="store.currentProjectId()!"
                ></app-issue-description-area>

                <!-- 评论 -->
                <app-issue-comment-area
                  (submit)="store.postComment($event)"
                  [busy]="store.busy()"
                  [logs]="store.logs()"
                  [members]="store.members()"
                  [projectId]="store.currentProjectId()!"
                  [canComment]="store.canComment()"
                ></app-issue-comment-area>
              </div>
              <div class="right-column">
                <!-- 基础信息 -->
                <app-issue-base-info-area [issue]="issue"></app-issue-base-info-area>

                <!-- 分支 -->
                <app-issue-branches
                  [branches]="store.branches()"
                  [canStartActions]="store.canStartBranchActions()"
                  [canCreate]="store.canCreateBranches()"
                  [canStartOwn]="store.canStartOwnBranch()"
                  [canCompleteBranch]="store.canCompleteBranch()"
                  [summary]="store.branchSummary()"
                  [busy]="store.busy()"
                  (startOwn)="openStartOwnBranch()"
                  (create)="openCreateBranch()"
                  (startBranch)="store.startBranch($event)"
                  (completeBranch)="store.completeBranch($event)"
                ></app-issue-branches>

                <!-- 合作人 -->
                <app-issue-collaborators-area
                  [issue]="issue"
                  [participants]="store.participants()"
                  [canManageParticipants]="store.canManageParticipants()"
                  [busy]="store.busy()"
                  (removeParticipant)="removeParticipant($event)"
                ></app-issue-collaborators-area>

                <!-- 附件 -->
                <app-issue-attachment-area
                  [attachments]="store.attachments()"
                  [projectId]="store.currentProjectId()!"
                  [members]="store.members()"
                ></app-issue-attachment-area>
              </div>
            </div>
          </div>
        }
      </ng-template>

      <app-issue-start-own-branch-dialog
        [open]="startOwnBranchOpen()"
        [issue]="store.issue()"
        [busy]="store.busy()"
        (confirm)="confirmStartOwnBranch($event)"
        (cancel)="startOwnBranchOpen.set(false)"
      ></app-issue-start-own-branch-dialog>

      <app-issue-create-branch-dialog
        [open]="createBranchOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [participants]="store.participants()"
        (cancel)="createBranchOpen.set(false)"
        (confirm)="confirmCreateBranch($event)"
      />

      <app-issue-close-dialog
        [open]="IssueCloseDialogOpen()"
        [busy]="store.busy()"
        [item]="store.issue()"
        (cancel)="cancelCloseDialog()"
        (confirm)="closeConfirm($event)"
      ></app-issue-close-dialog>

      <app-issue-add-participants-dialog
        [open]="IssueAddParticipantsDialogOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [members]="store.members()"
        [participants]="store.participants()"
        (cancel)="cancelAddParticipantsConfirm()"
        (confirm)="AddParticipantsConfirm($event)"
      ></app-issue-add-participants-dialog>

      <app-issue-resolve-dialog
        [open]="IssueResolveDialogOpen()"
        [busy]="store.busy()"
        [item]="store.issue()"
        (cancel)="cancelResolveDialog()"
        (confirm)="resolveConfirm($event)"
      ></app-issue-resolve-dialog>

      <app-issue-assign-dialog
        [open]="IssueAssignDialogOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [actionLabel]="store.assignActionLabel()"
        [members]="store.members()"
        (cancel)="cancelAssignDialog()"
        (confirm)="assignConfirm($event)"
      ></app-issue-assign-dialog>
    </nz-drawer>
  `,
  styles: `
    .title-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .subtitle {
        margin-right: 1rem;
        font-size: 12px;
        line-height: 1.4;
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
        background: #f1f5f9;
        color: #64748b;
      }
    }
    .detail-wrap {
      width: 100%;
      // height: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      .detail-header {
        width: 100%;
      }
      .detail-content {
        width: 100%;
        display: flex;
        gap: 10px;
      }
      .wrap-title {
        width: 100%;
        margin-bottom: 12px;
        font-size: 18px;
        font-weight: bold;
        border-bottom: 1px solid #bbbbbb;
      }
      .left-column {
        width: 60%;

        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .right-column {
        width: 40%;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    }
    .comment {
      .comment-item {
      }
    }
  `,
})
export class IssueDetailComponent {
  private readonly modal = inject(NzModalService);

  readonly store = inject(IssueDetailStore);
  readonly open = input(false);
  readonly close = output();

  // 对话框
  readonly startOwnBranchOpen = signal<boolean>(false);
  readonly createBranchOpen = signal<boolean>(false);
  readonly IssueCloseDialogOpen = signal<boolean>(false);
  readonly IssueAddParticipantsDialogOpen = signal<boolean>(false);
  readonly IssueResolveDialogOpen = signal<boolean>(false);
  readonly IssueAssignDialogOpen = signal<boolean>(false);

  readonly subtitleText = computed(() => this.store.issue()?.issueNo || '');
  readonly titleText = computed(() => this.store.issue()?.title || '问题详情');

  closeDetaile() {
    this.close.emit();
  }

  handleActions(action: IssueActionType) {
    switch (action) {
      case 'comments':
        break;
      case 'start': {
        this.startConfirm();
        break;
      }
      case 'claim': {
        this.claimConfirm();
        break;
      }
      case 'assign': {
        this.IssueAssignDialogOpen.set(true);
        break;
      }
      case 'wait-update': {
        this.waitForUpdateConfirm();
        break;
      }
      case 'resolve': {
        this.IssueResolveDialogOpen.set(true);
        break;
      }
      case 'verify':
        break;
      case 'reopen':
        break;
      case 'close': {
        this.IssueCloseDialogOpen.set(true);
        break;
      }
      case 'add_participants': {
        this.IssueAddParticipantsDialogOpen.set(true);
        break;
      }
      case 'remove_participants':
        break;
    }
  }

  // issue 开始处理
  private startConfirm() {
    this.modal.confirm({
      nzTitle:
        this.store.issue()?.status === 'pending_update'
          ? '确认继续处理该问题？'
          : '确认开始处理该问题？',
      nzContent:
        this.store.issue()?.status === 'pending_update'
          ? '继续处理后，状态将从“待提测”回到“处理中”。'
          : '开始处理后将进入处理流转，负责人可继续处理、转派或标记待提测。',
      nzOkText: this.store.issue()?.status === 'pending_update' ? '确认继续' : '确认开始',
      nzCancelText: '取消',
      nzOnOk: () => this.store.start(),
    });
  }

  // issue 标记待提测
  private waitForUpdateConfirm() {
    this.modal.confirm({
      nzTitle: '标记为待提测？',
      nzContent: '适用于代码已提交、等待测试验证的情况，方便后续单独筛选。',
      nzOkText: '确认标记',
      nzCancelText: '取消',
      nzOnOk: () => this.store.waitForUpdate(),
    });
  }

  // issue标记完成
  resolveConfirm(summary: string) {
    this.store.resolve(summary);
    this.IssueResolveDialogOpen.set(false);
  }
  cancelResolveDialog() {
    this.IssueResolveDialogOpen.set(false);
  }

  // issue 指派和认领
  cancelAssignDialog() {
    this.IssueAssignDialogOpen.set(false);
  }
  assignConfirm(input: AssignIssueInput) {
    this.store.assign(input);
    this.IssueAssignDialogOpen.set(false);
  }
  private claimConfirm() {
    this.modal.confirm({
      nzTitle: '确定认领该问题？',
      nzContent: '认领后你将成为负责人，可继续开始处理。（转派需前往NGM Hub V2）',
      nzOnOk: () => {
        this.store.claim();
      },
    });
  }

  // issue协作相关
  openStartOwnBranch(): void {
    this.startOwnBranchOpen.set(true);
  }

  confirmStartOwnBranch(input: { title: string }): void {
    this.store.startOwnBranch(input);
    this.startOwnBranchOpen.set(false);
  }

  // 创建协作分支
  openCreateBranch(): void {
    this.createBranchOpen.set(true);
  }

  confirmCreateBranch(input: { ownerUserId: string; title: string }): void {
    this.store.createBranch(input);
    this.createBranchOpen.set(false);
  }

  // issue关闭相关
  cancelCloseDialog() {
    this.IssueCloseDialogOpen.set(false);
  }
  closeConfirm(reason: string) {
    // this.issueDetailStore.close
  }

  // issue协作人
  cancelAddParticipantsConfirm() {
    this.IssueAddParticipantsDialogOpen.set(false);
  }

  AddParticipantsConfirm(input: AddParticipantsInput) {
    this.store.addParticipants(input);
    this.IssueAddParticipantsDialogOpen.set(false);
  }

  removeParticipant(participantId: string) {
    this.store.removeParticipant(participantId);
  }
}
