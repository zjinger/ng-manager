import { AppError } from '../../utils/app-error';
import { genId } from '../../utils/id';
import { nowIso } from '../../utils/time';
import { IssuePermissionService } from '../issue/issue.permission';
import { IssueRepo } from '../issue/issue.repo';
import { IssueLogService } from '../issue-log/issue-log.service';
import { IssueParticipantRepo } from './participant.repo';
import type { AddIssueParticipantInput, IssueParticipantEntity, RemoveIssueParticipantInput } from './participant.types';

export class IssueParticipantService {
  constructor(
    private readonly issueRepo: IssueRepo,
    private readonly repo: IssueParticipantRepo,
    private readonly permission: IssuePermissionService,
    private readonly logService: IssueLogService
  ) {}

  list(projectId: string, issueId: string): IssueParticipantEntity[] {
    this.requireIssue(projectId, issueId);
    return this.repo.listByIssueId(issueId);
  }

  add(input: AddIssueParticipantInput): IssueParticipantEntity[] {
    const issue = this.requireIssue(input.projectId, input.issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, 'add participant');
    this.assertParticipantStatus(issue.status);
    this.permission.assertCanManageParticipants(issue, operatorId);
    const member = this.permission.requireProjectMember(issue.projectId, input.userId.trim(), 'add participant');

    if (issue.assigneeId && issue.assigneeId === member.userId) {
      throw new AppError('ISSUE_PARTICIPANT_ASSIGNEE_DUPLICATE', 'assignee cannot also be a participant', 400);
    }

    const timestamp = nowIso();
    this.issueRepo.runInTransaction(() => {
      if (!this.repo.hasParticipant(issue.id, member.userId)) {
        this.repo.create({
          id: genId('ipt'),
          issueId: issue.id,
          userId: member.userId,
          userName: member.displayName,
          createdAt: timestamp
        });
        this.issueRepo.update(issue.projectId, issue.id, { updatedAt: timestamp });
        this.logService.record({
          issueId: issue.id,
          actionType: 'add_participant',
          fromStatus: issue.status,
          toStatus: issue.status,
          operatorId,
          operatorName: input.operatorName?.trim() || null,
          summary: `Added participant ${member.displayName}`
        });
      }
    });

    return this.repo.listByIssueId(issue.id);
  }

  remove(input: RemoveIssueParticipantInput): IssueParticipantEntity[] {
    const issue = this.requireIssue(input.projectId, input.issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, 'remove participant');
    this.assertParticipantStatus(issue.status);
    this.permission.assertCanManageParticipants(issue, operatorId);

    if (issue.assigneeId && issue.assigneeId === input.userId.trim()) {
      throw new AppError('ISSUE_PARTICIPANT_ASSIGNEE_DUPLICATE', 'cannot remove assignee from participants list', 400);
    }

    const participant = this.repo.findByIssueIdAndUserId(issue.id, input.userId.trim());
    const timestamp = nowIso();
    this.issueRepo.runInTransaction(() => {
      const removed = this.repo.delete(issue.id, input.userId.trim());
      if (removed) {
        this.issueRepo.update(issue.projectId, issue.id, { updatedAt: timestamp });
        this.logService.record({
          issueId: issue.id,
          actionType: 'remove_participant',
          fromStatus: issue.status,
          toStatus: issue.status,
          operatorId,
          operatorName: input.operatorName?.trim() || null,
          summary: `Removed participant ${participant?.userName || input.userId.trim()}`
        });
      }
    });

    return this.repo.listByIssueId(issue.id);
  }

  private requireIssue(projectId: string, issueId: string) {
    const issue = this.issueRepo.findById(projectId, issueId);
    if (!issue) {
      throw new AppError('ISSUE_NOT_FOUND', `issue not found: ${issueId}`, 404);
    }
    return issue;
  }

  private assertParticipantStatus(status: string): void {
    if (!['open', 'in_progress', 'reopened'].includes(status)) {
      throw new AppError('ISSUE_INVALID_STATUS', `participants cannot be changed in status ${status}`, 400);
    }
  }
}
