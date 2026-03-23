import { Injectable } from '@angular/core';

import type { AuthUser } from '../../../core/auth/auth.types';
import type { IssueEntity } from '../models/issue.model';

@Injectable({ providedIn: 'root' })
export class IssuePermissionService {
  canStart(issue: IssueEntity, user: AuthUser | null): boolean {
    return this.isAdmin(user) || (!!user?.userId && issue.assigneeId === user.userId);
  }

  canResolve(issue: IssueEntity, user: AuthUser | null): boolean {
    return this.canStart(issue, user);
  }

  canVerify(issue: IssueEntity, user: AuthUser | null): boolean {
    return (
      this.isAdmin(user) ||
      (!!user?.userId && (issue.verifierId === user.userId || issue.reporterId === user.userId))
    );
  }

  private isAdmin(user: AuthUser | null): boolean {
    return user?.role === 'admin';
  }
}
