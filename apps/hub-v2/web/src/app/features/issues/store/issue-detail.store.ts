import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, type Observable } from 'rxjs';

import { AuthStore } from '@core/auth';
import type { ProjectMemberEntity, ProjectMetaItem, ProjectVersionItem } from '../../projects/models/project.model';
import { ProjectApiService } from '../../projects/services/project-api.service';
import type {
  IssueAttachmentEntity,
  IssueCommentEntity,
  IssueEntity,
  IssueLogEntity,
  IssueParticipantEntity,
  UpdateIssueInput,
} from '../models/issue.model';
import { IssueApiService } from '../services/issue-api.service';
import { IssuePermissionService } from '../services/issue-permission.service';

@Injectable()
export class IssueDetailStore {
  private readonly issueApi = inject(IssueApiService);
  private readonly authStore = inject(AuthStore);
  private readonly permissionService = inject(IssuePermissionService);
  private readonly projectApi = inject(ProjectApiService);

  private readonly issueState = signal<IssueEntity | null>(null);
  private readonly logsState = signal<IssueLogEntity[]>([]);
  private readonly commentsState = signal<IssueCommentEntity[]>([]);
  private readonly participantsState = signal<IssueParticipantEntity[]>([]);
  private readonly attachmentsState = signal<IssueAttachmentEntity[]>([]);
  private readonly membersState = signal<ProjectMemberEntity[]>([]);
  private readonly modulesState = signal<ProjectMetaItem[]>([]);
  private readonly versionsState = signal<ProjectVersionItem[]>([]);
  private readonly environmentsState = signal<ProjectMetaItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);
  private readonly actionTickState = signal(0);

  readonly issue = computed(() => this.issueState());
  readonly logs = computed(() => this.logsState());
  readonly reopenReason = computed(() => {
    for (const log of this.logsState()) {
      if (log.actionType !== 'reopen') {
        continue;
      }
      const reason = this.extractReopenReason(log);
      if (reason) {
        return reason;
      }
    }
    return null;
  });
  readonly comments = computed(() => this.commentsState());
  readonly participants = computed(() => this.participantsState());
  readonly attachments = computed(() => this.attachmentsState());
  readonly members = computed(() => this.membersState());
  readonly modules = computed(() => this.modulesState());
  readonly versions = computed(() => this.versionsState());
  readonly environments = computed(() => this.environmentsState());
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());
  readonly actionTick = computed(() => this.actionTickState());
  readonly currentUser = this.authStore.currentUser;
  readonly availableMembers = computed(() => {
    const issue = this.issueState();
    const assigneeId = issue?.assigneeId ?? null;
    const usedUserIds = new Set(this.participantsState().map((item) => item.userId));
    return this.membersState().filter((item) => !usedUserIds.has(item.userId) && item.userId !== assigneeId);
  });
  readonly isProjectAdmin = computed(() => {
    const userId = this.currentUser()?.userId;
    if (!userId) {
      return false;
    }
    const member = this.membersState().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });
  readonly canEdit = computed(() => {
    const issue = this.issueState();
    if (!issue) {
      return false;
    }
    return this.permissionService.canEdit(issue, this.currentUser());
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
    return this.permissionService.getAssignActionLabel(issue, this.currentUser(), this.isProjectAdmin()) ?? '重新指派';
  });
  readonly canManageParticipants = computed(() => {
    const issue = this.issueState();
    if (!issue) {
      return false;
    }
    return this.permissionService.canManageParticipants(issue, this.currentUser(), this.isProjectAdmin());
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
    return !!issue && ['open', 'reopened'].includes(issue.status) && this.permissionService.canStart(issue, this.currentUser());
  });
  readonly canResolve = computed(() => {
    const issue = this.issueState();
    return !!issue && ['in_progress', 'reopened'].includes(issue.status) && this.permissionService.canResolve(issue, this.currentUser());
  });
  readonly canVerify = computed(() => {
    const issue = this.issueState();
    return !!issue && issue.status === 'resolved' && this.permissionService.canVerify(issue, this.currentUser());
  });
  readonly canReopen = computed(() => {
    const issue = this.issueState();
    return !!issue && ['resolved', 'verified', 'closed'].includes(issue.status) && this.permissionService.canVerify(issue, this.currentUser());
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
    this.loadingState.set(true);
    forkJoin({
      issue: this.issueApi.getById(issueId),
      logs: this.issueApi.listLogs(issueId),
      comments: this.issueApi.listComments(issueId),
      participants: this.issueApi.listParticipants(issueId),
      attachments: this.issueApi.listAttachments(issueId),
    }).subscribe({
      next: ({ issue, logs, comments, participants, attachments }) => {
        this.issueState.set(issue);
        this.logsState.set(logs.items);
        this.commentsState.set(comments.items);
        this.participantsState.set(participants.items);
        this.attachmentsState.set(attachments.items);
        forkJoin({
          members: this.projectApi.listMembers(issue.projectId),
          modules: this.projectApi.listModules(issue.projectId),
          versions: this.projectApi.listVersions(issue.projectId),
          environments: this.projectApi.listEnvironments(issue.projectId),
        }).subscribe({
          next: ({ members, modules, versions, environments }) => {
            this.membersState.set(members);
            this.modulesState.set(modules.filter((item) => item.enabled).sort((a, b) => a.sort - b.sort));
            this.versionsState.set(versions.filter((item) => item.enabled).sort((a, b) => a.sort - b.sort));
            this.environmentsState.set(environments.filter((item) => item.enabled).sort((a, b) => a.sort - b.sort));
            this.loadingState.set(false);
          },
          error: () => {
            this.loadingState.set(false);
          },
        });
      },
      error: () => {
        this.loadingState.set(false);
      },
    });
  }

  updateBasic(input: UpdateIssueInput): void {
    this.runIssueAction((issueId) => this.issueApi.update(issueId, input));
  }

  postComment(content: string, mentions: string[] = []): void {
    const issueId = this.issueState()?.id;
    if (!issueId || !content.trim()) {
      return;
    }

    this.busyState.set(true);
    this.issueApi.createComment(issueId, content.trim(), mentions).subscribe({
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
    this.runIssueAction((issueId) => this.issueApi.start(issueId));
  }

  claim(): void {
    this.runIssueAction((issueId) => this.issueApi.claim(issueId));
  }

  assign(assigneeId: string): void {
    if (!assigneeId.trim()) {
      return;
    }
    this.runIssueAction((issueId) => this.issueApi.assign(issueId, { assigneeId }));
  }

  resolve(summary?: string): void {
    this.runIssueAction((issueId) => this.issueApi.resolve(issueId, summary));
  }

  verify(): void {
    this.runIssueAction((issueId) => this.issueApi.verify(issueId));
  }

  reopen(remark?: string): void {
    this.runIssueAction((issueId) => this.issueApi.reopen(issueId, remark));
  }

  close(reason?: string, remark?: string): void {
    this.runIssueAction((issueId) => this.issueApi.close(issueId, { reason, remark }));
  }

  addParticipant(userId: string): void {
    const issueId = this.issueState()?.id;
    if (!issueId || !userId.trim()) {
      return;
    }

    this.busyState.set(true);
    this.issueApi.addParticipant(issueId, userId).subscribe({
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
    const issueId = this.issueState()?.id;
    if (!issueId) {
      return;
    }

    this.busyState.set(true);
    this.issueApi.removeParticipant(issueId, participantId).subscribe({
      next: () => {
        this.participantsState.update((items) => items.filter((item) => item.id !== participantId));
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  uploadAttachment(file: File): void {
    const issueId = this.issueState()?.id;
    if (!issueId) {
      return;
    }

    this.busyState.set(true);
    this.issueApi.uploadFile(file, issueId).subscribe({
      next: (upload) => {
        this.issueApi.addAttachment(issueId, upload.id).subscribe({
          next: (attachment) => {
            this.attachmentsState.update((items) => [...items, attachment]);
            this.busyState.set(false);
          },
          error: () => {
            this.busyState.set(false);
          },
        });
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  removeAttachment(attachmentId: string): void {
    const issueId = this.issueState()?.id;
    if (!issueId) {
      return;
    }

    this.busyState.set(true);
    this.issueApi.removeAttachment(issueId, attachmentId).subscribe({
      next: () => {
        this.attachmentsState.update((items) => items.filter((item) => item.id !== attachmentId));
        this.busyState.set(false);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  private runIssueAction(request: (issueId: string) => Observable<IssueEntity>): void {
    const issueId = this.issueState()?.id;
    if (!issueId) {
      return;
    }

    this.busyState.set(true);
    request(issueId).subscribe({
      next: (issue) => {
        this.issueState.set(issue);
        this.busyState.set(false);
        this.refreshLogs(issueId);
        this.actionTickState.update((value) => value + 1);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  private refreshLogs(issueId: string): void {
    this.issueApi.listLogs(issueId).subscribe({
      next: (logs) => this.logsState.set(logs.items),
    });
  }

  private extractReopenReason(log: IssueLogEntity): string | null {
    const metaRaw = log.metaJson?.trim();
    if (metaRaw) {
      try {
        const parsed = JSON.parse(metaRaw) as { reason?: unknown };
        const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';
        if (reason) {
          return reason;
        }
      } catch {}
    }

    const summary = log.summary?.trim() ?? '';
    const marker = '：';
    const index = summary.indexOf(marker);
    if (index >= 0 && index < summary.length - 1) {
      const text = summary.slice(index + 1).trim();
      return text || null;
    }
    return null;
  }
}
