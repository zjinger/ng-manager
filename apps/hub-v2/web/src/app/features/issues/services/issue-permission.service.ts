import { Injectable } from '@angular/core';

import type { AuthUser } from '@core/auth';
import type { IssueEntity } from '../models/issue.model';

@Injectable({ providedIn: 'root' })
export class IssuePermissionService {
  canEdit(issue: IssueEntity, user: AuthUser | null): boolean {
    return this.matchActor(user, issue.reporterId);
  }

  canAssign(issue: IssueEntity, user: AuthUser | null, isProjectAdmin = false): boolean {
    return !!this.getAssignActionLabel(issue, user, isProjectAdmin);
  }

  getAssignActionLabel(issue: IssueEntity, user: AuthUser | null, isProjectAdmin = false): string | null {
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

  canManageParticipants(issue: IssueEntity, user: AuthUser | null, isProjectAdmin = false): boolean {
    if (!['open', 'in_progress', 'pending_update'].includes(issue.status)) {
      return false;
    }

    return (
      this.isAdmin(user) ||
      isProjectAdmin ||
      this.matchActor(user, issue.reporterId) ||
      this.matchActor(user, issue.assigneeId)
    );
  }

  canClaim(issue: IssueEntity, user: AuthUser | null): boolean {
    return !!user?.userId && !issue.assigneeId && ['open', 'reopened', 'in_progress', 'pending_update'].includes(issue.status);
  }

  canStart(issue: IssueEntity, user: AuthUser | null): boolean {
    return this.isAdmin(user) || this.matchActor(user, issue.assigneeId);
  }

  canResolve(issue: IssueEntity, user: AuthUser | null): boolean {
    return this.canStart(issue, user);
  }

  canVerify(issue: IssueEntity, user: AuthUser | null): boolean {
    return this.isAdmin(user) || this.matchActor(user, issue.verifierId) || this.matchActor(user, issue.reporterId);
  }

  canClose(issue: IssueEntity, user: AuthUser | null): boolean {
    if (this.isAdmin(user)) {
      return true;
    }
    if (!this.matchActor(user, issue.reporterId)) {
      return false;
    }
    return ['open', 'reopened', 'verified'].includes(issue.status);
  }

  private isAdmin(user: AuthUser | null): boolean {
    return user?.role === 'admin';
  }

  private matchActor(user: AuthUser | null, actorId: string | null): boolean {
    if (!user || !actorId) {
      return false;
    }

    const userId = user.userId?.trim();
    const accountId = user.id?.trim();
    return actorId === userId || actorId === accountId;
  }
}
