import { Injectable } from '@angular/core';

import type { UserStore } from '@app/core/stores/user/user.store';
import type {
  IssueAttachmentEntity,
  IssueEntity,
  IssueParticipantEntity,
} from '../models/issue.model';
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
    return ['open', 'reopened', 'in_progress', 'verified'].includes(issue.status);
  }

  canDeleteAttachment(
    attachment: IssueAttachmentEntity,
    user: HubAuthUser | null,
    isProjectAdmin = false,
  ): boolean {
    return isProjectAdmin || this.matchActor(user, attachment.upload.uploaderId);
  }

  // 协作分支
  canCreateBranches(
    issue: IssueEntity,
    user: HubAuthUser | null,
    participants: IssueParticipantEntity[],
    isProjectAdmin = false,
  ): boolean {
    if (['verified', 'closed'].includes(issue.status)) {
      return false;
    }
    if (participants.length === 0) {
      return false;
    }
    return isProjectAdmin || this.matchActor(user, issue.assigneeId);
  }

  canStartBranchActions(issue: IssueEntity, user: HubAuthUser | null): boolean {
    return !['resolved', 'verified', 'closed'].includes(issue.status);
  }

  canStartOwnBranch(
    issue: IssueEntity,
    user: HubAuthUser | null,
    participants: IssueParticipantEntity[],
  ): boolean {
    if (!issue || !user || ['resolved', 'verified', 'closed'].includes(issue.status)) {
      return false;
    }

    // 非协作人员不允许开始协作分支
    const isParticipant = participants.some((item) => item.userId === user.userId);
    if (!isParticipant) {
      return false;
    }

    // 负责人不允许开始自己的协作分支
    return !this.matchActor(user, issue.reporterId);
  }

  // 权限检查函数
  hasPermissionToRead(user: HubAuthUser): boolean {
    // return user.scopes?.includes('issues:read') ?? false;
    return true;
  }

  hasPermissionToComment(user: HubAuthUser): boolean {
    return user.scopes?.includes('issue:comment:write') ?? false;
  }

  hasPermissionToTransition(user: HubAuthUser): boolean {
    return user.scopes?.includes('issue:transition:write') ?? false;
  }

  hasPermissionToAssign(user: HubAuthUser): boolean {
    return user.scopes?.includes('issue:assign:write') ?? false;
  }

  hasPermissionToManageParticipants(user: HubAuthUser): boolean {
    return user.scopes?.includes('issue:participant:write') ?? false;
  }

  hasPermissionToBranchOperation(user: HubAuthUser): boolean {
    return user.scopes?.includes('issue:branch:write') ?? false;
  }

  matchActor(user: HubAuthUser | null, actorId: string | null): boolean {
    if (!user || !actorId) {
      return false;
    }

    const userId = user.userId?.trim();
    // const accountId = user.id?.trim();
    return actorId === userId; //|| actorId === accountId;
  }
}
