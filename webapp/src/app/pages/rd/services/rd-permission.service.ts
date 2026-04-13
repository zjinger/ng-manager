import { Injectable } from '@angular/core';

import type { ProjectMemberEntity } from '@models/project.model';
import type { RdItemEntity } from '../models/rd.model';
import { HubAuthUser } from '@app/core/stores';

@Injectable({ providedIn: 'root' })
export class RdPermissionService {
  canEditProgress(item: RdItemEntity | null, userId: string | null): boolean {
    return !!item && !!userId && !!item.assigneeId && item.assigneeId === userId;
  }

  canStart(item: RdItemEntity | null, userId: string | null): boolean {
    return this.canEditProgress(item, userId);
  }

  canComplete(item: RdItemEntity | null, userId: string | null): boolean {
    return this.canEditProgress(item, userId);
  }

  canEditBasic(
    item: RdItemEntity | null,
    userId: string | null,
    members: ProjectMemberEntity[],
  ): boolean {
    if (!item || !userId) {
      return false;
    }
    if (item.creatorId === userId || item.assigneeId === userId) {
      return true;
    }
    return this.isProjectAdmin(userId, members);
  }

  canDelete(
    item: RdItemEntity | null,
    userId: string | null,
    members: ProjectMemberEntity[],
  ): boolean {
    if (!item || !userId) {
      return false;
    }
    if (item.creatorId === userId) {
      return true;
    }
    return this.isProjectAdmin(userId, members);
  }

  canBlock(
    item: RdItemEntity | null,
    userId: string | null,
    members: ProjectMemberEntity[],
  ): boolean {
    if (!item || !userId) {
      return false;
    }
    if (item.assigneeId === userId) {
      return true;
    }
    return this.isProjectAdmin(userId, members);
  }

  canResume(
    item: RdItemEntity | null,
    userId: string | null,
    members: ProjectMemberEntity[],
  ): boolean {
    return this.canBlock(item, userId, members);
  }

  canAdvance(
    item: RdItemEntity | null,
    userId: string | null,
    members: ProjectMemberEntity[],
  ): boolean {
    if (!item) {
      return false;
    }
    if (item.status !== 'done' && item.status !== 'accepted') {
      return false;
    }
    return this.canEditBasic(item, userId, members);
  }

  // RD 权限检查函数
  hasPermissionToRead(user: HubAuthUser | null): boolean {
    return !!user && (user.scopes?.includes('rd:read') ?? false);
  }

  hasPermissionToTransition(user: HubAuthUser | null): boolean {
    return !!user && (user.scopes?.includes('rd:transition:write') ?? false);
  }

  hasPermissionToEdit(user: HubAuthUser | null): boolean {
    return !!user && (user.scopes?.includes('rd:edit:write') ?? false);
  }

  hasPermissionToDelete(user: HubAuthUser | null): boolean {
    return !!user && (user.scopes?.includes('rd:delete:write') ?? false);
  }

  private isProjectAdmin(userId: string, members: ProjectMemberEntity[]): boolean {
    const member = members.find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  }
}
