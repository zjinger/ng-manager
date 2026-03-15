import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import type { ProjectMemberItem } from '../../../projects/projects.model';
import { HubDateTimePipe } from '../../../../shared/pipes/date-time.pipe';
import {
  formatActionTransition,
  issueActionColor,
  issueActionLabel,
  issueDisplayStatusColor,
  issueDisplayStatusLabel,
  issuePriorityColor,
  issuePriorityLabel,
  issueTypeColor,
  issueTypeLabel,
  memberDisplay,
  type IssueAttachment,
  type IssueActionPanelSubmit,
  type IssueCommentMention,
  type IssueDetailResult
} from '../../issues.model';
import { IssueAttachmentsComponent } from '../issue-attachments/issue-attachments.component';
import { IssueCommentsComponent } from '../issue-comments/issue-comments.component';
import { IssueParticipantsComponent } from '../issue-participants/issue-participants.component';

@Component({
  selector: 'app-issue-detail',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTagModule,
    HubDateTimePipe,
    IssueAttachmentsComponent,
    IssueCommentsComponent,
    IssueParticipantsComponent
  ],
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.less']
})
export class IssueDetailComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() detail: IssueDetailResult | null = null;
  @Input() projectMembers: ProjectMemberItem[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() currentUserId: string | null = null;
  @Input() isAdmin = false;
  @Input() actionLoading = false;
  @Input() participantSaving = false;
  @Input() commentSubmitting = false;
  @Input() attachmentUploading = false;

  @Output() readonly editRequested = new EventEmitter<void>();
  @Output() readonly actionSubmitted = new EventEmitter<IssueActionPanelSubmit>();
  @Output() readonly participantAdded = new EventEmitter<string>();
  @Output() readonly participantRemoved = new EventEmitter<string>();
  @Output() readonly commentSubmitted = new EventEmitter<{ content: string; mentions: IssueCommentMention[] }>();
  @Output() readonly attachmentsUploaded = new EventEmitter<File[]>();
  @Output() readonly attachmentDeleted = new EventEmitter<string>();

  protected readonly actionForm = this.fb.nonNullable.group({
    assigneeId: ['']
  });

  protected readonly statusLabel = issueDisplayStatusLabel;
  protected readonly statusColor = issueDisplayStatusColor;
  protected readonly priorityLabel = issuePriorityLabel;
  protected readonly priorityColor = issuePriorityColor;
  protected readonly typeLabel = issueTypeLabel;
  protected readonly typeColor = issueTypeColor;
  protected readonly actionLabel = issueActionLabel;
  protected readonly actionColor = issueActionColor;
  protected readonly actionTransition = formatActionTransition;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['detail']) {
      this.actionForm.patchValue({
        assigneeId: this.detail?.issue.assigneeId ?? ''
      });
    }
  }

  protected memberLabel(member: ProjectMemberItem): string {
    return memberDisplay(member);
  }

  protected assigneeOptions(): ProjectMemberItem[] {
    return this.projectMembers;
  }

  protected canEdit(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    if (issue.status === 'open' || issue.status === 'reopened') {
      return this.isReporter() || this.isAdmin;
    }
    if (issue.status === 'in_progress') {
      return this.isReporter() || this.isAssignee() || this.isParticipant() || this.isAdmin;
    }
    return false;
  }

  protected canAssign(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    return (issue.status === 'open' || issue.status === 'reopened') && (this.isReporter() || this.isAdmin);
  }

  protected canClaim(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    if (!(issue.status === 'open' || issue.status === 'reopened')) {
      return false;
    }
    return !issue.assigneeId && this.isProjectMember();
  }

  protected canStart(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    return (issue.status === 'open' || issue.status === 'reopened') && !!issue.assigneeId && (this.isAssignee() || this.isAdmin);
  }

  protected canResolve(): boolean {
    return this.detail?.issue.status === 'in_progress' && (this.isAssignee() || this.isAdmin);
  }

  protected canVerify(): boolean {
    const issue = this.detail?.issue;
    return !!issue && issue.status === 'resolved' && (this.isReporter() || this.isAdmin);
  }

  protected canReassign(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    return ['open', 'in_progress', 'reopened'].includes(issue.status) && !!issue.assigneeId && (this.isAssignee() || this.isAdmin);
  }

  protected canManageParticipants(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    return ['open', 'in_progress', 'reopened'].includes(issue.status) && !!issue.assigneeId && (this.isAssignee() || this.isAdmin);
  }

  protected canReopen(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    return ['resolved', 'verified', 'closed'].includes(issue.status) && (this.isReporter() || this.isAdmin);
  }

  protected canClose(): boolean {
    const issue = this.detail?.issue;
    if (!issue) return false;
    return issue.status === 'verified' && (this.isReporter() || this.isAdmin);
  }

  protected canComment(): boolean {
    return this.isProjectMember();
  }

  protected canUpload(): boolean {
    return this.isProjectMember();
  }

  protected canDeleteAttachmentIds(): string[] {
    const detail = this.detail;
    if (!detail) {
      return [];
    }
    if (detail.issue.status === 'closed') {
      return [];
    }
    return detail.attachments.filter((item) => this.canDeleteAttachment(item)).map((item) => item.id);
  }

  protected showResolvedReviewActions(): boolean {
    return this.detail?.issue.status === 'resolved' && (this.canVerify() || this.canReopen());
  }

  protected showVerifiedActions(): boolean {
    return this.detail?.issue.status === 'verified' && (this.canClose() || this.canReopen());
  }

  protected showClosedReopenAction(): boolean {
    return this.detail?.issue.status === 'closed' && this.canReopen();
  }

  protected submitAssign(): void {
    const assigneeId = this.actionForm.controls.assigneeId.value.trim();
    if (!assigneeId) {
      return;
    }
    this.actionSubmitted.emit({ action: 'assign', assigneeId });
  }

  protected submitClaim(): void {
    this.actionSubmitted.emit({ action: 'claim' });
  }

  protected submitReassign(): void {
    const assigneeId = this.actionForm.controls.assigneeId.value.trim();
    if (!assigneeId) {
      return;
    }
    this.actionSubmitted.emit({ action: 'reassign', assigneeId });
  }

  protected submitStart(): void {
    this.actionSubmitted.emit({ action: 'start' });
  }

  protected submitResolve(): void {
    this.actionSubmitted.emit({ action: 'resolve' });
  }

  protected submitVerify(): void {
    this.actionSubmitted.emit({ action: 'verify' });
  }

  protected submitReopen(): void {
    this.actionSubmitted.emit({ action: 'reopen' });
  }

  protected submitClose(): void {
    this.actionSubmitted.emit({ action: 'close' });
  }

  private isReporter(): boolean {
    return !!this.currentUserId && this.detail?.issue.reporterId === this.currentUserId;
  }

  private isAssignee(): boolean {
    return !!this.currentUserId && this.detail?.issue.assigneeId === this.currentUserId;
  }

  private isParticipant(): boolean {
    return !!this.currentUserId && !!this.detail?.participants.some((item) => item.userId === this.currentUserId);
  }

  private isProjectMember(): boolean {
    if (this.isAdmin) {
      return true;
    }
    return !!this.currentUserId && this.projectMembers.some((item) => item.userId === this.currentUserId);
  }

  private canDeleteAttachment(attachment: IssueAttachment): boolean {
    return this.isAdmin || this.isAssignee() || (!!this.currentUserId && attachment.uploaderId === this.currentUserId);
  }
}
