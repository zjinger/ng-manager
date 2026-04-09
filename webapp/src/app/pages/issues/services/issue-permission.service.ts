import { Injectable } from '@angular/core';

import type { UserStore } from '@app/core/stores/user/user.store';
import type { IssueEntity } from '../models/issue.model';
import { HubAuthUser } from '@app/core/stores/user/user.types';

@Injectable({ providedIn: 'root' })
export class IssuePermissionService {
  canAssign(issue: IssueEntity, user: HubAuthUser | null, isProjectAdmin = false): boolean {
    return !!this.getAssignActionLabel(issue, user, isProjectAdmin);
  }

  getAssignActionLabel(issue: IssueEntity, user: HubAuthUser | null, isProjectAdmin = false): string | null {
    if (!user) {
      return null;
    }

    if (!['open', 'reopened', 'in_progress'].includes(issue.status)) {
      return null;
    }
    const isReporter = this.matchActor(user, issue.reporterId);
    const isAssignee = this.matchActor(user, issue.assigneeId);
    const isManager = this.isAdmin(user) || isProjectAdmin;

    // 已有负责人时：负责人显示“转派”。
    if (issue.assigneeId && isAssignee) {
      return '转派';
    }

    // 管理角色：未有负责人时“指派”，已有负责人时“重新指派”。
    if (isManager) {
      return issue.assigneeId ? '重新指派' : '指派';
    }

    // 未有负责人时：提报人显示“指派”。
    if (!issue.assigneeId && isReporter) {
      return '指派';
    }

    // 已有负责人且处于开始处理前：提报人显示“重新指派”。
    if (issue.assigneeId && isReporter && ['open', 'reopened'].includes(issue.status)) {
      return '重新指派';
    }

    return null;
  }

  canManageParticipants(issue: IssueEntity, user: HubAuthUser | null, isProjectAdmin = false): boolean {
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

  canClaim(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return !!user?.userId && !issue.assigneeId && ['open', 'reopened', 'in_progress'].includes(issue.status);
  }

  canStart(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return this.isAdmin(user) || this.matchActor(user, issue.assigneeId);
  }

  canResolve(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return this.canStart(issue, user);
  }

  canVerify(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return this.isAdmin(user) || this.matchActor(user, issue.verifierId) || this.matchActor(user, issue.reporterId);
  }

  canClose(issue: IssueEntity, user: HubAuthUser | null): boolean {
    if (this.isAdmin(user)) {
      return true;
    }
    if (!this.matchActor(user, issue.reporterId)) {
      return false;
    }
    return ['open', 'reopened', 'verified'].includes(issue.status);
  }

  private isAdmin(user: HubAuthUser | null): boolean {
    return user?.role === 'admin';
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
