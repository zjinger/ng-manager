import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { SideDetailLayoutComponent } from '../../../../shared/ui/side-detail-layout/side-detail-layout.component';
import { IssueActivityTimelineComponent } from '../../components/issue-activity-timeline/issue-activity-timeline.component';
import { IssueAttachmentsPanelComponent } from '../../components/issue-attachments-panel/issue-attachments-panel.component';
import { IssueCommentEditorComponent } from '../../components/issue-comment-editor/issue-comment-editor.component';
import { IssueCollaboratorsPanelComponent } from '../../components/issue-collaborators-panel/issue-collaborators-panel.component';
import { IssueDetailHeaderComponent } from '../../components/issue-detail-header/issue-detail-header.component';
import { IssuePropsPanelComponent } from '../../components/issue-props-panel/issue-props-panel.component';
import { IssueAssignDialogComponent } from '../../dialogs/issue-assign-dialog/issue-assign-dialog.component';
import { IssueTransitionDialogComponent } from '../../dialogs/issue-transition-dialog/issue-transition-dialog.component';
import { IssueDetailStore } from '../../store/issue-detail.store';

@Component({
  selector: 'app-issue-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    NzButtonModule,
    NzIconModule,
    SideDetailLayoutComponent,
    IssueActivityTimelineComponent,
    IssueAttachmentsPanelComponent,
    IssueCommentEditorComponent,
    IssueCollaboratorsPanelComponent,
    IssueDetailHeaderComponent,
    IssuePropsPanelComponent,
    IssueAssignDialogComponent,
    IssueTransitionDialogComponent,
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

      @if (store.loading()) {
        <div class="state-card">正在加载 Issue 详情…</div>
      } @else if (store.issue(); as issue) {
        <section class="detail-stack">
          <app-issue-detail-header
            [issue]="issue"
            [canStart]="store.canStart()"
            [canAssign]="store.canAssign()"
            [canResolve]="store.canResolve()"
            [canVerify]="store.canVerify()"
            [canReopen]="store.canReopen()"
            (start)="store.start()"
            (assign)="assignIssue()"
            (resolve)="resolveIssue()"
            (verify)="store.verify()"
            (reopen)="reopenIssue()"
          />

          <section class="description-card">
            <h3>问题描述</h3>
            <div class="description">{{ issue.description || '暂无描述' }}</div>
            @if (issue.resolutionSummary) {
              <div class="resolution">
                <div class="resolution__label">解决说明</div>
                <div>{{ issue.resolutionSummary }}</div>
              </div>
            }
          </section>

          <app-side-detail-layout [staticSide]="embedded()">
            <div detail-main class="detail-main">
              <app-issue-comment-editor
                [comments]="store.comments()"
                [busy]="store.busy()"
                (submit)="store.postComment($event)"
              />
              <app-issue-activity-timeline [logs]="store.logs()" />
            </div>

            <div detail-side class="detail-side">
              <app-issue-props-panel [issue]="issue" />
              <app-issue-collaborators-panel
                [issue]="issue"
                [participants]="store.participants()"
                [members]="store.members()"
                [availableMembers]="store.availableMembers()"
                [canAssign]="store.canAssign()"
                [busy]="store.busy()"
                (assign)="store.assign($event)"
                (addParticipant)="store.addParticipant($event)"
                (removeParticipant)="store.removeParticipant($event)"
              />
              <app-issue-attachments-panel
                [attachments]="store.attachments()"
                [busy]="store.busy()"
                (upload)="store.uploadAttachment($event)"
                (remove)="store.removeAttachment($event)"
              />
            </div>
          </app-side-detail-layout>
        </section>
      } @else {
        <div class="state-card">未找到该 Issue</div>
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
    </div>
  `,
  styles: [
    `
      .detail-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .detail-stack {
        display: flex;
        flex-direction: column;
        gap: 20px;
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
      .detail-main,
      .detail-side {
        min-width: 0;
      }
      .detail-page.is-embedded .detail-stack {
        gap: 18px;
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
  private readonly route = inject(ActivatedRoute);
  readonly issueId = input<string | null>(null);
  readonly embedded = input(false);
  readonly assignOpen = signal(false);
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

  confirmAssign(assigneeId: string): void {
    this.store.assign(assigneeId);
    this.assignOpen.set(false);
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
