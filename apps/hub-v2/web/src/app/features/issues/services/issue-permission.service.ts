import { Injectable } from '@angular/core';

import type { AuthUser } from '../../../core/auth/auth.types';
import type { IssueEntity } from '../models/issue.model';

@Injectable({ providedIn: 'root' })
export class IssuePermissionService {
  canAssign(issue: IssueEntity, user: AuthUser | null, isProjectAdmin = false): boolean {
    if (!user) {
      return false;
    }

    if (this.isAdmin(user) || isProjectAdmin) {
      return true;
    }

    // 提报人仅可在开始处理前（open/reopened）重新指派
    return this.matchActor(user, issue.reporterId) && ['open', 'reopened'].includes(issue.status);
  }

  canManageParticipants(issue: IssueEntity, user: AuthUser | null, isProjectAdmin = false): boolean {
    if (!['open', 'in_progress'].includes(issue.status)) {
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
    return !!user?.userId && !issue.assigneeId && ['open', 'reopened', 'in_progress'].includes(issue.status);
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
