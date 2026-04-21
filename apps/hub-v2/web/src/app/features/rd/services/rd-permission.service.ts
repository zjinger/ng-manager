import { Injectable } from '@angular/core';

import type { ProjectMemberEntity } from '../../projects/models/project.model';
import type { RdItemEntity } from '../models/rd.model';

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

  canEditBasic(item: RdItemEntity | null, userId: string | null, members: ProjectMemberEntity[]): boolean {
    void members;
    if (!item || !userId) {
      return false;
    }
    return item.creatorId === userId;
  }

  canClose(item: RdItemEntity | null, userId: string | null): boolean {
    if (!item || !userId) {
      return false;
    }
    return item.creatorId === userId;
  }

  canDelete(item: RdItemEntity | null, userId: string | null, members: ProjectMemberEntity[]): boolean {
    void members;
    return this.canClose(item, userId);
  }

  canBlock(item: RdItemEntity | null, userId: string | null, members: ProjectMemberEntity[]): boolean {
    if (!item || !userId) {
      return false;
    }
    if (item.assigneeId === userId) {
      return true;
    }
    return this.isProjectAdmin(userId, members);
  }

  canResume(item: RdItemEntity | null, userId: string | null, members: ProjectMemberEntity[]): boolean {
    return this.canBlock(item, userId, members);
  }

  canAdvance(item: RdItemEntity | null, userId: string | null, members: ProjectMemberEntity[]): boolean {
    if (!item) {
      return false;
    }
    if (item.status !== 'accepted') {
      return false;
    }
    return this.isVerifier(item, userId, members);
  }

  canAccept(item: RdItemEntity | null, userId: string | null, members: ProjectMemberEntity[]): boolean {
    if (!item || item.status !== 'done') {
      return false;
    }
    return this.isVerifier(item, userId, members);
  }

  private isVerifier(item: RdItemEntity, userId: string | null, members: ProjectMemberEntity[]): boolean {
    if (!userId) {
      return false;
    }
    if (!item.verifierId && item.creatorId === userId) {
      return true;
    }
    const currentMember = members.find((member) => member.userId === userId) ?? null;
    const verifierId = item.verifierId?.trim() || null;
    if (verifierId) {
      if (verifierId === userId) {
        return true;
      }
      // 兼容历史数据：可能误存为 project_member.id
      if (currentMember && verifierId === currentMember.id) {
        return true;
      }
    }
    const verifierName = item.verifierName?.trim() || null;
    if (verifierName && currentMember?.displayName?.trim() === verifierName) {
      return true;
    }
    return false;
  }

  private isProjectAdmin(userId: string, members: ProjectMemberEntity[]): boolean {
    const member = members.find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  }
}
