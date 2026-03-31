import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, from, type Observable } from 'rxjs';

import { UserStore } from '@app/core/stores/user.store';
import type { ProjectMemberEntity } from '../models/issue.model';
import { ProjectApiService } from '../../projects/services/project-api.service';
import type {
  IssueAttachmentEntity,
  IssueCommentEntity,
  IssueEntity,
  IssueLogEntity,
  IssueParticipantEntity,
} from '../models/issue.model';
import { IssueApiService } from '../services/issue-api.service';
import { IssuePermissionService } from '../services/issue-permission.service';
import { ProjectStateService } from '@pages/projects/services/project.state.service';

@Injectable()
export class IssueDetailStore {
  private readonly issueApi = inject(IssueApiService);
  private readonly userStore = inject(UserStore);
  private readonly permissionService = inject(IssuePermissionService);
  // private readonly projectApi = inject(ProjectApiService);
  private readonly projectState = inject(ProjectStateService);

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
  // private readonly currentProject = this.projectState.currentProject;
  private readonly currentProjectId = this.projectState.currentProjectId;

  readonly issue = computed(() => this.issueState());
  readonly logs = computed(() => this.logsState());
  readonly comments = computed(() => this.commentsState());
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

  readonly isProjectAdmin = computed(() => {
    const userId = this.currentUser()?.userId;
    if (!userId) {
      return false;
    }
    const member = this.membersState().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });

  readonly canAssign = computed(() => {
    const issue = this.issueState();
    const currentUser = this.currentUser();
    if (!issue) {
      return false;
    }
    return this.permissionService.canAssign(issue, currentUser, this.isProjectAdmin());
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

  readonly canManageParticipants = computed(() => {
    const issue = this.issueState();
    if (!issue) {
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
    if (!issue) {
      return false;
    }
    return this.permissionService.canClaim(issue, this.currentUser());
  });

  readonly canStart = computed(() => {
    const issue = this.issueState();
    return (
      !!issue &&
      ['open', 'reopened'].includes(issue.status) &&
      this.permissionService.canStart(issue, this.currentUser())
    );
  });

  readonly canResolve = computed(() => {
    const issue = this.issueState();
    return (
      !!issue &&
      ['in_progress', 'reopened'].includes(issue.status) &&
      this.permissionService.canResolve(issue, this.currentUser())
    );
  });

  readonly canVerify = computed(() => {
    const issue = this.issueState();
    return (
      !!issue &&
      issue.status === 'resolved' &&
      this.permissionService.canVerify(issue, this.currentUser())
    );
  });

  readonly canReopen = computed(() => {
    const issue = this.issueState();
    return (
      !!issue &&
      ['resolved', 'verified', 'closed'].includes(issue.status) &&
      this.permissionService.canVerify(issue, this.currentUser())
    );
  });
  
  readonly canClose = computed(() => {
    const issue = this.issueState();
    return (
      !!issue &&
      ['open', 'in_progress', 'resolved', 'verified', 'reopened'].includes(issue.status) &&
      this.permissionService.canClose(issue, this.currentUser())
    );
  });

  load(issueId: string): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    this.loadingState.set(true);
    forkJoin({
      issue: this.issueApi.getIssueDetail(currentProjectId, issueId),
      logs: this.issueApi.getIssueLogs(currentProjectId, issueId),
      // comments: this.issueApi.getIssueComments(currentProjectId, issueId),
      // participants: this.issueApi.getIssueParticipants(currentProjectId, issueId),
      // attachments: this.issueApi.getIssueAttachments(currentProjectId, issueId),
    }).subscribe({
      next: ({ issue, logs }) => {
        this.issueState.set(issue);
        this.logsState.set(logs.items);
        // this.commentsState.set(comments.items);
        // this.participantsState.set(participants.items);
        // this.attachmentsState.set(attachments.items);
        // from(this.issueApi.getProjectMembers(issue.projectId)).subscribe({
        //   next: (members) => {
        //     this.membersState.set(members.items);
        //     this.loadingState.set(false);
        //   },
        //   error: () => {
        //     this.loadingState.set(false);
        //   },
        // });
      },
      error: () => {
        this.loadingState.set(false);
      },
    });
  }

  postComment(content: string, mentions: string[] = []): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    const issueId = this.issueState()?.id;
    if (!issueId || !content.trim()) {
      return;
    }

    this.busyState.set(true);
    from(
      this.issueApi.createIssueComment(currentProjectId, issueId, content.trim(), mentions),
    ).subscribe({
      next: (comment) => {
        this.commentsState.update((items) => [comment, ...items]);
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  start(): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    this.runIssueAction((issueId) => this.issueApi.startIssue(currentProjectId, issueId));
  }

  claim(): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    this.runIssueAction((issueId) => this.issueApi.claimIssue(currentProjectId, issueId));
  }

  assign(assigneeId: string): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    if (!assigneeId.trim()) {
      return;
    }
    this.runIssueAction((issueId) =>
      this.issueApi.assignIssue(currentProjectId, issueId, { assigneeId }),
    );
  }

  resolve(summary?: string): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    this.runIssueAction((issueId) =>
      this.issueApi.resolveIssue(currentProjectId, issueId, summary),
    );
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

  addParticipant(userId: string): void {
    const issueId = this.issueState()?.id;
    if (!issueId || !userId.trim()) {
      return;
    }

    this.busyState.set(true);
    from(this.issueApi.addParticipant(issueId, userId)).subscribe({
      next: (participant) => {
        this.participantsState.update((items) => [...items, participant]);
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  addParticipants(userIds: string[]): void {
    const issueId = this.issueState()?.id;
    const ids = [...new Set(userIds.map((item) => item.trim()).filter(Boolean))];
    if (!issueId || ids.length === 0) {
      return;
    }

    this.busyState.set(true);
    forkJoin(ids.map((userId) => this.issueApi.addParticipant(issueId, userId))).subscribe({
      next: (participants) => {
        this.participantsState.update((items) => [...items, ...participants]);
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  removeParticipant(participantId: string): void {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) {
      return;
    }
    const issueId = this.issueState()?.id;
    if (!issueId) {
      return;
    }

    this.busyState.set(true);
    from(this.issueApi.removeParticipant(currentProjectId, issueId, participantId)).subscribe({
      next: () => {
        this.participantsState.update((items) => items.filter((item) => item.id !== participantId));
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
}
