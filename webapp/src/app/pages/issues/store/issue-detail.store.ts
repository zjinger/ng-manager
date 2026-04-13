import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, from } from 'rxjs';

import { ProjectContextStore } from '@app/core/stores';
import { UserStore } from '@app/core/stores/user/user.store';
import type {
  AddParticipantsInput,
  AssignIssueInput,
  createCommentInput,
  IssueAttachmentEntity,
  IssueCommentEntity,
  IssueEntity,
  IssueLogEntity,
  IssueParticipantEntity,
  ProjectMemberEntity,
} from '../models/issue.model';
import { IssueApiService } from '../services/issue-api.service';
import { IssuePermissionService } from '../services/issue-permission.service';

@Injectable()
export class IssueDetailStore {
  private readonly issueApi = inject(IssueApiService);
  private readonly userStore = inject(UserStore);
  private readonly permissionService = inject(IssuePermissionService);

  private readonly projectContext = inject(ProjectContextStore);

  private readonly issueState = signal<IssueEntity | null>(null);
  private readonly logsState = signal<IssueLogEntity[]>([]);
  private readonly commentsState = signal<IssueCommentEntity[]>([]);
  private readonly participantsState = signal<IssueParticipantEntity[]>([]);
  private readonly attachmentsState = signal<IssueAttachmentEntity[]>([]);
  private readonly membersState = signal<ProjectMemberEntity[]>([]);
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);
  private readonly actionTickState = signal(0);

  // 当前项目
  readonly currentProjectId = this.projectContext.currentProjectId;

  readonly issue = computed(() => this.issueState());
  readonly logs = computed(() => this.logsState());
  // readonly comments = computed(() => this.commentsState());
  readonly participants = computed(() => this.participantsState());
  readonly attachments = computed(() => this.attachmentsState());
  readonly members = computed(() => this.membersState());
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());
  readonly actionTick = computed(() => this.actionTickState());
  readonly currentUser = this.userStore.currentUser;

  readonly availableMembers = computed(() => {
    const issue = this.issueState();
    const assigneeId = issue?.assigneeId ?? null;
    const usedUserIds = new Set(this.participantsState().map((item) => item.userId));
    return this.membersState().filter(
      (item) => !usedUserIds.has(item.userId) && item.userId !== assigneeId,
    );
  });

  /*---------------------------------权限（user的scopes内是token权限，优先级最高的）--------------------------- */
  readonly isProjectAdmin = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return false;
    }
    const member = this.membersState().find((item) => item.userId === user.userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });

  readonly canAssign = computed(() => {
    const issue = this.issueState();
    const currentUser = this.currentUser();
    if (!issue || !currentUser || !this.permissionService.hasPermissionToAssign(currentUser)) {
      return false;
    }
    return this.permissionService.canAssign(issue, currentUser, this.isProjectAdmin());
  });

  readonly canManageParticipants = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToManageParticipants(user)) {
      return false;
    }
    return this.permissionService.canManageParticipants(
      issue,
      this.currentUser(),
      this.isProjectAdmin(),
    );
  });

  readonly canClaim = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToTransition(user)) {
      return false;
    }
    return this.permissionService.canClaim(issue, this.currentUser());
  });

  readonly canStart = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToTransition(user)) {
      return false;
    }
    return (
      !!issue &&
      ['open', 'reopened', 'pending_update'].includes(issue.status) &&
      this.permissionService.canStart(issue, this.currentUser())
    );
  });

  readonly canResolve = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToTransition(user)) {
      return false;
    }
    return (
      !!issue &&
      ['in_progress', 'pending_update'].includes(issue.status) &&
      this.permissionService.canResolve(issue, this.currentUser())
    );
  });

  readonly canPendingUpdate = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToTransition(user)) {
      return false;
    }
    return (
      !!issue &&
      issue.status === 'in_progress' &&
      this.permissionService.canResolve(issue, this.currentUser())
    );
  });

  readonly canVerify = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToTransition(user)) {
      return false;
    }
    return (
      !!issue &&
      issue.status === 'resolved' &&
      this.permissionService.canVerify(issue, this.currentUser())
    );
  });

  readonly canReopen = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToTransition(user)) {
      return false;
    }
    return (
      !!issue &&
      ['resolved', 'verified', 'closed'].includes(issue.status) &&
      this.permissionService.canVerify(issue, this.currentUser())
    );
  });

  canComment = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToComment(user)) {
      return false;
    }
    return true;
  });

  canRead = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToRead(user)) {
      return false;
    }
    return true;
  });

  readonly canClose = computed(() => {
    const issue = this.issueState();
    const user = this.currentUser();
    if (!issue || !user || !this.permissionService.hasPermissionToTransition(user)) {
      return false;
    }
    return (
      !!issue &&
      ['open', 'in_progress', 'resolved', 'verified', 'reopened'].includes(issue.status) &&
      this.permissionService.canClose(issue, this.currentUser())
    );
  });

  readonly startActionLabel = computed(() => {
    const issue = this.issueState();
    if (!issue) {
      return '开始处理';
    }

    return issue.status === 'pending_update' ? '继续处理' : '开始处理';
  });

  readonly assignActionLabel = computed(() => {
    const issue = this.issueState();
    if (!issue) {
      return '重新指派';
    }
    return (
      this.permissionService.getAssignActionLabel(
        issue,
        this.currentUser(),
        this.isProjectAdmin(),
      ) ?? '重新指派'
    );
  });

  load(issueId: string): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    this.userStore.ensureUserLoaded();
    this.loadingState.set(true);
    forkJoin({
      issue: this.issueApi.getIssueDetail(currentProjectId, issueId),
      logs: this.issueApi.getIssueLogs(currentProjectId, issueId),
      // comments: this.issueApi.getIssueComments(currentProjectId, issueId),
      participants: this.issueApi.getIssueParticipants(currentProjectId, issueId),
      attachments: this.issueApi.getIssueAttachments(currentProjectId, issueId),
    }).subscribe({
      next: ({ issue, logs, participants, attachments }) => {
        this.issueState.set(issue);
        this.logsState.set(logs.items);
        // this.commentsState.set(comments.items);
        this.participantsState.set(participants.items);
        this.attachmentsState.set(attachments.items);
      },
      error: () => {
        this.loadingState.set(false);
      },
    });
  }

  postComment(comment: createCommentInput): void {
    const issueId = this.issueState()?.id;
    if (!issueId || !comment.content.trim()) {
      return;
    }

    this.busyState.set(true);
    from(
      this.issueApi.createIssueComment(issueId, comment.content.trim(), comment.mentions),
    ).subscribe({
      next: (comment) => {
        this.commentsState.update((items) => [comment, ...items]);
        this.refreshLogs(issueId);
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  start(): void {
    this.runIssueAction((issueId) => this.issueApi.startIssue(issueId));
  }

  claim(): void {
    this.runIssueAction((issueId) => this.issueApi.claimIssue(issueId));
  }

  assign(input: AssignIssueInput): void {
    if (!input.assigneeId.trim()) {
      return;
    }
    this.runIssueAction((issueId) => this.issueApi.assignIssue(issueId, input));
  }

  waitForUpdate(): void {
    this.runIssueAction((issueId) => this.issueApi.waitUpdateIssue(issueId));
  }

  resolve(summary?: string): void {
    this.runIssueAction((issueId) => this.issueApi.resolveIssue(issueId, summary));
  }

  // verify(): void {
  //       const currentProjectId = this.currentProjectId();
  //   if (!currentProjectId) {
  //     return;
  //   }
  //   this.runIssueAction((issueId) => this.issueApi.verify(issueId));
  // }

  // reopen(remark?: string): void {
  //       const currentProjectId = this.currentProjectId();
  //   if (!currentProjectId) {
  //     return;
  //   }
  //   this.runIssueAction((issueId) => this.issueApi.reopen(issueId, remark));
  // }

  // close(reason?: string, remark?: string): void {
  //       const currentProjectId = this.currentProjectId();
  //   if (!currentProjectId) {
  //     return;
  //   }
  //   this.runIssueAction((issueId) => this.issueApi.close(issueId, { reason, remark }));
  // }

  addParticipants(input: AddParticipantsInput): void {
    const issueId = this.issueState()?.id;
    const userIds = input.userIds;
    const ids = [...new Set(userIds.map((item) => item.trim()).filter(Boolean))];
    if (!issueId || ids.length === 0) {
      return;
    }
    // const inputFormated = { userIds: ids };

    this.busyState.set(true);
    forkJoin(ids.map((userId) => this.issueApi.addParticipant(issueId, { userId }))).subscribe({
      next: (participants) => {
        this.participantsState.update((items) => [...items, ...participants]);
        this.refreshLogs(issueId);
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  removeParticipant(participantId: string): void {
    const issueId = this.issueState()?.id;
    if (!issueId) {
      return;
    }

    this.busyState.set(true);
    from(this.issueApi.removeParticipant(issueId, participantId)).subscribe({
      next: () => {
        this.participantsState.update((items) => items.filter((item) => item.id !== participantId));
        this.refreshLogs(issueId);
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  // uploadAttachment(file: File): void {
  //   const issueId = this.issueState()?.id;
  //   if (!issueId) {
  //     return;
  //   }

  //   this.busyState.set(true);
  //   this.issueApi.uploadFile(file, issueId).subscribe({
  //     next: (upload) => {
  //       this.issueApi.addAttachment(issueId, upload.id).subscribe({
  //         next: (attachment) => {
  //           this.attachmentsState.update((items) => [...items, attachment]);
  //           this.busyState.set(false);
  //         },
  //         error: () => {
  //           this.busyState.set(false);
  //         },
  //       });
  //     },
  //     error: () => {
  //       this.busyState.set(false);
  //     },
  //   });
  // }

  // removeAttachment(attachmentId: string): void {
  //   const issueId = this.issueState()?.id;
  //   if (!issueId) {
  //     return;
  //   }

  //   this.busyState.set(true);
  //   this.issueApi.removeAttachment(issueId, attachmentId).subscribe({
  //     next: () => {
  //       this.attachmentsState.update((items) => items.filter((item) => item.id !== attachmentId));
  //       this.busyState.set(false);
  //     },
  //     error: () => {
  //       this.busyState.set(false);
  //     },
  //   });
  // }

  private runIssueAction(request: (issueId: string) => Promise<IssueEntity>): void {
    const issueId = this.issueState()?.id;
    if (!issueId) {
      return;
    }

    this.busyState.set(true);
    request(issueId)
      .then((issue) => {
        this.issueState.set(issue);
        this.busyState.set(false);
        this.refreshLogs(issueId);
        this.actionTickState.update((value) => value + 1);
      })
      .catch((error) => {
        this.busyState.set(false);
      });
  }

  private refreshLogs(issueId: string): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    from(this.issueApi.getIssueLogs(currentProjectId, issueId)).subscribe({
      next: (logs) => this.logsState.set(logs.items),
    });
  }

  setSelectedIssue(issue: IssueEntity | null): void {
    this.issueState.set(issue);
  }
}
