import { AppError } from '../../utils/app-error';
import { genId } from '../../utils/id';
import { nowIso } from '../../utils/time';
import { IssueCommentRepo } from './comment.repo';
import type { CreateIssueCommentInput, IssueCommentEntity, IssueCommentMentionEntity } from './comment.types';
import { IssueRepo } from '../issue/issue.repo';
import { IssuePermissionService } from '../issue/issue.permission';
import { IssueLogService } from '../issue-log/issue-log.service';
import { ProjectMemberService } from '../project/project-member.service';

export class IssueCommentService {
  constructor(
    private readonly issueRepo: IssueRepo,
    private readonly repo: IssueCommentRepo,
    private readonly projectMemberService: ProjectMemberService,
    private readonly permission: IssuePermissionService,
    private readonly logService: IssueLogService
  ) {}

  list(projectId: string, issueId: string): IssueCommentEntity[] {
    this.requireIssue(projectId, issueId);
    return this.repo.listByIssueId(issueId);
  }

  create(input: CreateIssueCommentInput): IssueCommentEntity {
    const issue = this.requireIssue(input.projectId, input.issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, 'comment');
    this.permission.assertCanComment(issue, operatorId);
    const now = nowIso();
    const authorName = input.operatorName?.trim() || this.projectMemberService.findMemberByProjectAndUserId(issue.projectId, operatorId)?.displayName || null;
    const entity: IssueCommentEntity = {
      id: genId('icm'),
      issueId: issue.id,
      authorId: operatorId,
      authorName,
      content: input.content.trim(),
      mentions: this.normalizeMentions(issue.projectId, input.mentions),
      createdAt: now,
      updatedAt: now
    };

    this.issueRepo.runInTransaction(() => {
      this.repo.create(entity);
      this.issueRepo.update(issue.projectId, issue.id, { updatedAt: now });
      this.logService.record({
        issueId: issue.id,
        actionType: 'comment_add',
        fromStatus: issue.status,
        toStatus: issue.status,
        operatorId,
        operatorName: authorName,
        summary: 'Added comment'
      });
    });

    return entity;
  }

  private requireIssue(projectId: string, issueId: string) {
    const issue = this.issueRepo.findById(projectId, issueId);
    if (!issue) {
      throw new AppError('ISSUE_NOT_FOUND', `issue not found: ${issueId}`, 404);
    }
    return issue;
  }

  private normalizeMentions(projectId: string, mentions?: IssueCommentMentionEntity[]): IssueCommentMentionEntity[] {
    if (!mentions || mentions.length === 0) {
      return [];
    }
    const result: IssueCommentMentionEntity[] = [];
    const seen = new Set<string>();
    for (const item of mentions) {
      const userId = item.userId?.trim();
      if (!userId || seen.has(userId)) {
        continue;
      }
      const member = this.projectMemberService.findMemberByProjectAndUserId(projectId, userId);
      if (!member) {
        continue;
      }
      result.push({ userId, displayName: member.displayName });
      seen.add(userId);
    }
    return result;
  }
}
