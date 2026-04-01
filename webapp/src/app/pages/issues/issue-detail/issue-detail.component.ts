import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule, NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { IssueActionAreaComponent } from './issue-action-area/issue-action-area.component';
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
import { MarkdownComponent } from 'ngx-markdown';
import { MarkdownViewerComponent } from '@app/shared/components/markdown-viewer';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { CommonModule } from '@angular/common';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { IssueCollaboratorsAreaComponent } from './issue-collaborators-area/issue-collaborators-panel.component';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzFormModule } from 'ng-zorro-antd/form';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { IssueCommentAreaComponent } from './issue-comment-area/issue-comment-editor.component';

@Component({
  selector: 'app-issue-detail',
  imports: [
    NzDrawerModule,
    NzCardModule,
    NzEmptyModule,
    NzDescriptionsModule,
    NzTimelineModule,
    NzAvatarModule,
    NzInputModule,
    NzCommentModule,
    NzListModule,
    NzFormModule,
    FormsModule,
    NzButtonModule,
    IssueActionAreaComponent,
    IssueCollaboratorsAreaComponent,
    IssueCommentAreaComponent,
    MarkdownViewerComponent,
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
        @if (!issues()) {
          <nz-empty>正在加载测试单详情…</nz-empty>
        } @else if (issues(); as issue) {
          <div class="detail-wrap">
            <div class="left-column">
              <nz-card class="detail-item">
                <h2 class="wrap-title">操作</h2>

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
              </nz-card>
              <nz-card class="detail-item">
                <h2 class="wrap-title">详情</h2>
                @if (issue.description) {
                  <app-markdown-viewer
                    [content]="issue.description"
                    [showToc]="true"
                    [tocVariant]="'floating'"
                    [tocCollapsedByDefault]="true"
                  ></app-markdown-viewer>
                } @else {
                  暂无描述
                }
                @if (issue.resolutionSummary) {
                  <div class="resolution">
                    <div class="resolution-label">解决说明</div>
                    <div class="resolution-content">{{ issue.resolutionSummary }}</div>
                  </div>
                }
                @if (issue.closeReason) {
                  <div class="resolution">
                    <div class="resolution-label">关闭原因</div>
                    <div class="resolution-content">{{ issue.closeReason }}</div>
                  </div>
                }
              </nz-card>

              <nz-card class="detail-item comment">
                <h2 class="wrap-title">评论/备注</h2>
                <app-issue-comment-area
                  [comments]="comments()"
                  (submit)="commentSubmit.emit($event)"
                ></app-issue-comment-area>
              </nz-card>
            </div>
            <div class="right-column">
              <nz-card class="detail-item  base-info">
                <h2 class="wrap-title">基础信息</h2>
                <nz-descriptions nzBordered nzSize="small" [nzColumn]="1">
                  <nz-descriptions-item nzTitle="状态">
                    {{ issue.status }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="优先级">
                    {{ issue.priority }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="类型">
                    {{ issue.type }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="模块">
                    {{ issue.moduleCode || '-' }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="提报人">
                    {{ issue.reporterName }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="负责人">
                    {{ issue.assigneeName || '-' }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="验收人">
                    {{ issue.verifierName || '-' }}
                  </nz-descriptions-item>
                  <nz-descriptions-item nzTitle="创建时间">
                    {{ issue.createdAt | date: 'yyyy-MM-dd HH:mm:ss' }}
                  </nz-descriptions-item>
                </nz-descriptions>
              </nz-card>

              <nz-card class="detail-item">
                <h2 class="wrap-title">合作人</h2>
                <app-issue-collaborators-area [issue]="issue" [participants]="participants()"></app-issue-collaborators-area>
              </nz-card>

              <nz-card class="detail-item">
                <h2 class="wrap-title">附件</h2>
              </nz-card>
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
      height: 100%;
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
      .resolution {
        margin-top: 26px;
        .resolution-label {
          font-size: 0.8rem;
          font-weight: bold;
          color: grey;
        }
        .resolution-content {
          font-size: 0.8rem;
          text-indent: 0.8rem;
        }
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

  readonly issues = input<IssueEntity | null>();
  readonly open = input(false);
  readonly busy = input(false);
  readonly logs = input<IssueLogEntity[]>([]);
  readonly comments = input<IssueCommentEntity[]>([]);
  readonly attachments = input<IssueAttachmentEntity[]>();
  readonly participants = input<IssueParticipantEntity[]>([]);

  readonly placement = input<NzDrawerPlacement>('right');
  readonly close = output();
  readonly actionClick = output<IssueActionType>();
  readonly commentSubmit = output<createCommentInput>();
  readonly progressChange = output<number>();
  readonly deleteClick = output<void>();

  readonly subtitleText = computed(() => this.issues()?.issueNo || '');
  readonly titleText = computed(() => this.issues()?.title || '问题详情');

  closeDetaile() {
    this.close.emit();
  }

  handleActionClick(action: IssueActionType) {
    this.actionClick.emit(action);
  }
}
