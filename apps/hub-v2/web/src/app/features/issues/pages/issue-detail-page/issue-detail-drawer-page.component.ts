import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';

import { IssueActivityTimelineComponent } from '../../components/issue-activity-timeline/issue-activity-timeline.component';
import { IssueAttachmentsPanelComponent } from '../../components/issue-attachments-panel/issue-attachments-panel.component';
import { IssueCollaboratorsPanelComponent } from '../../components/issue-collaborators-panel/issue-collaborators-panel.component';
import { IssueCommentEditorComponent } from '../../components/issue-comment-editor/issue-comment-editor.component';
import { IssueDetailDrawerHeaderComponent } from '../../components/issue-detail-header/issue-detail-drawer-header.component';
import { IssuePropsPanelComponent } from '../../components/issue-props-panel/issue-props-panel.component';
import { IssueAssignDialogComponent } from '../../dialogs/issue-assign-dialog/issue-assign-dialog.component';
import { IssueAddParticipantsDialogComponent } from '../../dialogs/issue-add-participants-dialog/issue-add-participants-dialog.component';
import { IssueTransitionDialogComponent } from '../../dialogs/issue-transition-dialog/issue-transition-dialog.component';
import { IssueDetailStore } from '../../store/issue-detail.store';
import { MarkdownViewerComponent } from '@app/shared/ui';

@Component({
  selector: 'app-issue-detail-drawer-page',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    IssueActivityTimelineComponent,
    IssueAttachmentsPanelComponent,
    IssueCommentEditorComponent,
    IssueCollaboratorsPanelComponent,
    IssueDetailDrawerHeaderComponent,
    IssuePropsPanelComponent,
    IssueAssignDialogComponent,
    IssueAddParticipantsDialogComponent,
    IssueTransitionDialogComponent,
    MarkdownViewerComponent
  ],
  providers: [IssueDetailStore],
  template: `
    <div class="detail-page">
      @if (store.loading()) {
        <div class="state-card">正在加载测试单详情…</div>
      } @else if (store.issue(); as issue) {
        <section class="detail-stack">
          <app-issue-detail-drawer-header
            [issue]="issue"
            [canStart]="store.canStart()"
            [canClaim]="store.canClaim()"
            [canAssign]="store.canAssign()"
            [canManageParticipants]="store.canManageParticipants()"
            [canResolve]="store.canResolve()"
            [canVerify]="store.canVerify()"
            [canReopen]="store.canReopen()"
            (start)="confirmStart()"
            (claim)="store.claim()"
            (assign)="assignIssue()"
            (addParticipants)="openAddParticipants()"
            (resolve)="resolveIssue()"
            (verify)="store.verify()"
            (reopen)="reopenIssue()"
          />

          <section class="description-card">
            <h3>问题描述</h3>
            <div class="description">
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
            </div>
            @if (issue.resolutionSummary) {
              <div class="resolution">
                <div class="resolution__label">解决说明</div>
                <div>{{ issue.resolutionSummary }}</div>
              </div>
            }
          </section>
          <div class="detail-main">
            <app-issue-comment-editor
              [comments]="store.comments()"
              [members]="store.members()"
              [busy]="store.busy()"
              (submit)="store.postComment($event.content, $event.mentions)"
            />
            <app-issue-activity-timeline [logs]="store.logs()" />
          </div>
        </section>
        <div  class="detail-side">
            <app-issue-props-panel [issue]="issue" />
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
              [busy]="store.busy()"
              (upload)="store.uploadAttachment($event)"
              (remove)="store.removeAttachment($event)"
            />
          </div>
      } @else {
        <div class="state-card">未找到该测试单</div>
      }

      <app-issue-assign-dialog
        [open]="assignOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
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

      <app-issue-add-participants-dialog
        [open]="addParticipantsOpen()"
        [busy]="store.busy()"
        [issue]="store.issue()"
        [members]="store.availableMembers()"
        (cancel)="addParticipantsOpen.set(false)"
        (confirm)="confirmAddParticipants($event.userIds)"
      />
    </div>
  `,
  styles: [
    `
      .detail-page {
        display:grid;
        gap:12px;
        grid-template-columns: 2fr 1fr;
      }
      .detail-stack {
        display: flex;
        flex-direction: column;
        gap:12px;
      }
      .detail-side{
        display: flex;
        flex-direction: column;
        gap:12px;
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
      .description-card{
        max-height: 500px;
        overflow: auto;
      }
      .description-card h3 {
        margin: 0 0 14px;
        color: var(--text-primary);
        font-size: 15px;
        font-weight: 600;
      }
      .description {
        color: var(--text-secondary);
        white-space: pre-wrap;
        line-height: 1.7;
      }
      .resolution {
        margin-top: 22px;
        padding: 18px 20px 0;
        border-top: 1px solid var(--border-color);
        color: var(--text-secondary);
      }
      .resolution__label {
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.04em;
      }
      .detail-main{
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
     
      :host-context(html[data-theme='dark']) .back-link,
      :host-context(html[data-theme='dark']) .state-card,
      :host-context(html[data-theme='dark']) .description-card {
        border-color: rgba(148, 163, 184, 0.14);
      }
      .back-link__icon {
        font-size: 12px;
      }
     
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueDetailDrawerPageComponent {
  readonly store = inject(IssueDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly modal = inject(NzModalService);
  readonly issueId = input<string | null>(null);
  readonly assignOpen = signal(false);
  readonly addParticipantsOpen = signal(false);
  readonly resolveOpen = signal(false);
  readonly reopenOpen = signal(false);
  private readonly loadedIssueId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const issueId = this.issueId() ?? this.route.snapshot.paramMap.get('issueId');
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

  confirmStart(): void {
    this.modal.confirm({
      nzTitle: '确认开始处理该问题？',
      nzContent: '开始处理后，提报人将不能再重新指派负责人。',
      nzOkText: '确认开始',
      nzCancelText: '取消',
      nzOnOk: () => this.store.start(),
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

  confirmResolve(summary: string): void {
    this.store.resolve(summary);
    this.resolveOpen.set(false);
  }

  confirmReopen(remark: string): void {
    this.store.reopen(remark);
    this.reopenOpen.set(false);
  }
}
