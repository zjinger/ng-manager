import { Injectable } from '@angular/core';

import type { UserStore } from '@app/core/stores/user/user.store';
import type { IssueEntity } from '../models/issue.model';
import { HubAuthUser } from '@app/core/stores/user/user.types';

@Injectable({ providedIn: 'root' })
export class IssuePermissionService {
  canEdit(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return this.matchActor(user, issue.reporterId);
  }

  canAssign(issue: IssueEntity, user: HubAuthUser | null, isProjectAdmin = false): boolean {
    return !!this.getAssignActionLabel(issue, user, isProjectAdmin);
  }

  getAssignActionLabel(
    issue: IssueEntity,
    user: HubAuthUser | null,
    isProjectAdmin = false,
  ): string | null {
    if (!user) {
      return null;
    }

    if (!['open', 'reopened', 'in_progress', 'pending_update'].includes(issue.status)) {
      return null;
    }
    const isReporter = this.matchActor(user, issue.reporterId);
    const isAssignee = this.matchActor(user, issue.assigneeId);
    const isManager = isProjectAdmin;

    // 未有负责人时：提报人或管理角色可指派。
    if (!issue.assigneeId && (isReporter || isManager)) {
      return '指派';
    }

    // 已有负责人后：仅当前负责人可转派。
    if (issue.assigneeId && isAssignee) {
      return '转派';
    }

    return null;
  }

  canManageParticipants(
    issue: IssueEntity,
    user: HubAuthUser | null,
    isProjectAdmin = false,
  ): boolean {
    if (!['open', 'in_progress', 'pending_update'].includes(issue.status)) {
      return false;
    }
    if (!issue.assigneeId) {
      return false;
    }

    return (
      isProjectAdmin ||
      this.matchActor(user, issue.reporterId) ||
      this.matchActor(user, issue.assigneeId)
    );
  }

  canClaim(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return (
      !!user?.userId &&
      !issue.assigneeId &&
      ['open', 'reopened', 'in_progress', 'pending_update'].includes(issue.status)
    );
  }

  canStart(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return this.matchActor(user, issue.assigneeId);
  }

  canResolve(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return this.canStart(issue, user);
  }

  canVerify(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return this.matchActor(user, issue.verifierId) || this.matchActor(user, issue.reporterId);
  }

  canClose(issue: IssueEntity, user: HubAuthUser | null): boolean {
    if (!this.matchActor(user, issue.reporterId)) {
      return false;
    }
    return ['open', 'reopened', 'verified'].includes(issue.status);
  }

  private matchActor(user: HubAuthUser | null, actorId: string | null): boolean {
    if (!user || !actorId) {
      return false;
    }

    const userId = user.userId?.trim();
    const accountId = user.id?.trim();
    return actorId === userId || actorId === accountId;
  }
}
