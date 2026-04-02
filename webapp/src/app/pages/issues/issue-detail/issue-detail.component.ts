import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { NzDrawerModule, NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import {
  createCommentInput,
  IssueActionType,
  IssueAttachmentEntity,
  IssueCommentEntity,
  IssueEntity,
  IssueLogEntity,
  IssueParticipantEntity,
} from '../models/issue.model';
import { IssueDetailStore } from '../store/issue-detail.store';
import { IssueActionAreaComponent } from './issue-action-area/issue-action-area.component';
import { IssueAttachmentAreaComponent } from './issue-attachment-area/issue-attachment-area.component';
import { IssueBaseInfoAreaComponent } from './issue-base-info-area/issue-base-info-area.component';
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
    CommonModule,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="true"
      [nzMaskClosable]="true"
      [nzWidth]="950"
      [nzWrapClassName]="'rd-detail-drawer'"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      [nzPlacement]="placement()"
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
        @if (!issue()) {
          <nz-empty>正在加载测试单详情…</nz-empty>
        } @else if (issue(); as issue) {
          <div class="detail-wrap">
            <div class="left-column">
              <!-- 操作 -->
              <app-issue-action-area
                [issue]="issue"
                (actionClick)="handleActionClick($event)"
                [canStart]="store.canStart()"
                [canClaim]="store.canClaim()"
                [canAssign]="store.canAssign()"
                [assignActionLabel]="store.assignActionLabel()"
                [canManageParticipants]="store.canManageParticipants()"
                [canResolve]="store.canResolve()"
                [canVerify]="store.canVerify()"
                [canReopen]="store.canReopen()"
                [canClose]="store.canClose()"
              ></app-issue-action-area>

              <!-- 详情 -->
              <app-issue-description-area [issue]="issue"></app-issue-description-area>

              <!-- 评论 -->
              <app-issue-comment-area
                [comments]="comments()"
                (submit)="commentSubmit.emit($event)"
              ></app-issue-comment-area>
            </div>
            <div class="right-column">
              <!-- 基础信息 -->
              <app-issue-base-info-area [issue]="issue"></app-issue-base-info-area>

              <!-- 合作人 -->
              <app-issue-collaborators-area
                [issue]="issue"
                [participants]="participants()"
              ></app-issue-collaborators-area>

              <!-- 附件 -->
              <app-issue-attachment-area [attachments]="attachments()"></app-issue-attachment-area>
            </div>
          </div>
        }
      </ng-template>
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
      gap: 10px;
      .wrap-title {
        width: 100%;
        margin-bottom: 12px;
        font-size: 18px;
        font-weight: bold;
        border-bottom: 1px solid #bbbbbb;
      }
      .left-column {
        width: 65%;

        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .right-column {
        width: 35%;
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
  readonly store = inject(IssueDetailStore);

  readonly issue = input<IssueEntity | null>();
  readonly open = input(false);
  readonly busy = input(false);
  readonly logs = input<IssueLogEntity[]>([]);
  readonly comments = input<IssueCommentEntity[]>([]);
  readonly attachments = input<IssueAttachmentEntity[]>([]);
  readonly participants = input<IssueParticipantEntity[]>([]);

  readonly placement = input<NzDrawerPlacement>('right');
  readonly close = output();
  readonly actionClick = output<IssueActionType>();
  readonly commentSubmit = output<createCommentInput>();
  readonly progressChange = output<number>();
  readonly deleteClick = output<void>();

  readonly subtitleText = computed(() => this.issue()?.issueNo || '');
  readonly titleText = computed(() => this.issue()?.title || '问题详情');

  closeDetaile() {
    this.close.emit();
  }

  handleActionClick(action: IssueActionType) {
    this.actionClick.emit(action);
  }
}
