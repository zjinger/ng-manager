import Database from "better-sqlite3";
import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import { IssueAttachmentService } from "../issue-attachment/attachment.service";
import type { CreateIssueAttachmentInput, RemoveIssueAttachmentInput } from "../issue-attachment/attachment.types";
import { IssueCommentService } from "../issue-comment/comment.service";
import type { CreateIssueCommentInput } from "../issue-comment/comment.types";
import { IssueLogService } from "../issue-log/issue-log.service";
import { IssueParticipantRepo } from "../issue-participant/participant.repo";
import { IssueParticipantService } from "../issue-participant/participant.service";
import type { AddIssueParticipantInput, RemoveIssueParticipantInput } from "../issue-participant/participant.types";
import { ProjectMemberService } from "../project/project-member.service";
import { ProjectRepo } from "../project/project.repo";
import { IssuePermissionService } from "./issue.permission";
import { IssueRepo } from "./issue.repo";
import type {
  AssignIssueInput,
  ClaimIssueInput,
  CloseIssueInput,
  CreateIssueInput,
  IssueDetailResult,
  IssueEntity,
  IssueListResult,
  IssueStatus,
  ListIssuesQuery,
  ReassignIssueInput,
  ReopenIssueInput,
  ResolveIssueInput,
  StartIssueInput,
  UpdateIssueInput,
  VerifyIssueInput
} from "./issue.types";

const MAX_ISSUE_NO_RETRY = 5;

type CurrentUserIssueQuery = Omit<ListIssuesQuery, "projectId"> & {
  projectId?: string;
};

const ISSUE_NO_PREFIX: Record<IssueEntity["type"], string> = {
  bug: "BUG",
  feature: "FEAT",
  change: "CHG",
  improvement: "IMP",
  task: "TASK",
  test: "TEST"
};

export class IssueService {
  constructor(
    private readonly repo: IssueRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly projectMemberService: ProjectMemberService,
    private readonly participantRepo: IssueParticipantRepo,
    private readonly participantService: IssueParticipantService,
    private readonly commentService: IssueCommentService,
    private readonly attachmentService: IssueAttachmentService,
    private readonly logService: IssueLogService,
    private readonly permission: IssuePermissionService
  ) { }

  list(projectId: string, query: Omit<ListIssuesQuery, "projectId">): IssueListResult {
    this.requireProject(projectId);
    return this.attachParticipantNames(this.repo.list({ ...query, projectId }));
  }

  listCurrentUserIssues(operatorId: string, query: CurrentUserIssueQuery): IssueListResult {
    const normalizedOperatorId = this.permission.requireOperatorId(operatorId, "list current user issues");
    const scopedProjectIds = query.projectId
      ? this.projectMemberService.findMemberByProjectAndUserId(query.projectId, normalizedOperatorId)
        ? [query.projectId]
        : []
      : this.projectMemberService.listProjectIdsByUserId(normalizedOperatorId);

    return this.attachParticipantNames(this.repo.listByProjectIds(scopedProjectIds, {
      status: query.status,
      priority: query.priority,
      type: query.type,
      assigneeId: query.assigneeId,
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize
    }));
  }

  getById(projectId: string, issueId: string): IssueEntity {
    const issue = this.repo.findById(projectId, issueId);
    if (!issue) {
      throw new AppError("ISSUE_NOT_FOUND", `issue not found: ${issueId}`, 404);
    }
    return issue;
  }

  getDetail(projectId: string, issueId: string): IssueDetailResult {
    const issue = this.getById(projectId, issueId);
    return {
      issue,
      participants: this.participantService.list(projectId, issueId),
      comments: this.commentService.list(projectId, issueId),
      attachments: this.attachmentService.list(projectId, issueId),
      actionLogs: this.logService.list(issueId)
    };
  }

  create(input: CreateIssueInput): IssueEntity {
    this.requireProject(input.projectId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "create issue");
    this.permission.assertCanCreate(input.projectId, operatorId);
    const reporter = this.permission.requireProjectMember(input.projectId, operatorId, "create issue");

    const issueType = input.type ?? "bug";

    let assigneeId: string | null = null;
    let assigneeName: string | null = null;
    if (input.assigneeId?.trim()) {
      const assignee = this.permission.requireProjectMember(input.projectId, input.assigneeId.trim(), "create issue with assignee");
      assigneeId = assignee.userId;
      assigneeName = assignee.displayName;
    }

    for (let attempt = 1; attempt <= MAX_ISSUE_NO_RETRY; attempt += 1) {
      const now = nowIso();
      const entity: IssueEntity = {
        id: genId("iss"),
        projectId: input.projectId,
        issueNo: this.generateIssueNo(issueType),
        title: input.title.trim(),
        description: input.description?.trim() || "",
        type: issueType,
        status: "open",
        priority: input.priority ?? "medium",
        reporterId: reporter.userId,
        reporterName: reporter.displayName,
        assigneeId,
        assigneeName,
        reopenCount: 0,
        moduleCode: input.moduleCode?.trim() || null,
        versionCode: input.versionCode?.trim() || null,
        environmentCode: input.environmentCode?.trim() || null,
        resolutionSummary: null,
        closeReason: null,
        closeRemark: null,
        startedAt: null,
        resolvedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now
      };

      try {
        this.repo.runInTransaction(() => {
          this.repo.create(entity);
          if (assigneeId) {
            this.participantRepo.delete(entity.id, assigneeId);
          }
          this.logService.record({
            issueId: entity.id,
            actionType: "create",
            fromStatus: null,
            toStatus: entity.status,
            operatorId,
            operatorName: input.operatorName?.trim() || reporter.displayName,
            summary: assigneeName ? `创建工单并指派给 ${assigneeName}` : "创建工单"
          });
        });
        return entity;
      } catch (error) {
        if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE" && attempt < MAX_ISSUE_NO_RETRY) {
          continue;
        }
        throw error;
      }
    }

    throw new AppError("ISSUE_CREATE_FAILED", "failed to create issue", 500);
  }

  update(projectId: string, issueId: string, input: UpdateIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "edit issue");
    this.assertStatus(issue.status, ["open", "in_progress", "reopened"], "edit issue");
    this.permission.assertCanEdit(issue, operatorId);

    const changed = this.repo.update(projectId, issueId, {
      title: input.title?.trim(),
      description: input.description?.trim(),
      type: input.type,
      priority: input.priority,
      moduleCode: input.moduleCode === undefined ? undefined : (input.moduleCode?.trim() || null),
      versionCode: input.versionCode === undefined ? undefined : (input.versionCode?.trim() || null),
      environmentCode: input.environmentCode === undefined ? undefined : (input.environmentCode?.trim() || null),
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("ISSUE_UPDATE_FAILED", "failed to update issue", 500);
    }
    this.logService.record({
      issueId,
      actionType: "edit",
      fromStatus: issue.status,
      toStatus: issue.status,
      operatorId,
      operatorName: input.operatorName?.trim() || null,
      summary: "编辑工单"
    });
    return this.getById(projectId, issueId);
  }

  assign(projectId: string, issueId: string, input: AssignIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "assign issue");
    this.assertStatus(issue.status, ["open", "reopened"], "assign issue");
    this.permission.assertCanAssign(issue, operatorId);
    const assignee = this.permission.requireProjectMember(projectId, input.assigneeId.trim(), "assign issue");

    this.repo.runInTransaction(() => {
      const changed = this.repo.update(projectId, issueId, {
        assigneeId: assignee.userId,
        assigneeName: assignee.displayName,
        updatedAt: nowIso()
      });
      if (!changed) {
        throw new AppError("ISSUE_ASSIGN_FAILED", "failed to assign issue", 500);
      }
      this.participantRepo.delete(issue.id, assignee.userId);
      this.logService.record({
        issueId,
        actionType: "assign",
        fromStatus: issue.status,
        toStatus: issue.status,
        operatorId,
        operatorName: input.operatorName?.trim() || null,
        summary: `指派给 ${assignee.displayName}`
      });
    });

    return this.getById(projectId, issueId);
  }

  claim(projectId: string, issueId: string, input: ClaimIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "claim issue");
    this.assertStatus(issue.status, ["open", "reopened"], "claim issue");
    this.permission.assertCanClaim(issue, operatorId);
    const member = this.permission.requireProjectMember(projectId, operatorId, "claim issue");

    this.repo.runInTransaction(() => {
      const changed = this.repo.update(projectId, issueId, {
        assigneeId: member.userId,
        assigneeName: member.displayName,
        updatedAt: nowIso()
      });
      if (!changed) {
        throw new AppError("ISSUE_CLAIM_FAILED", "failed to claim issue", 500);
      }
      this.participantRepo.delete(issue.id, member.userId);
      this.logService.record({
        issueId,
        actionType: "claim",
        fromStatus: issue.status,
        toStatus: issue.status,
        operatorId,
        operatorName: input.operatorName?.trim() || member.displayName,
        summary: `${member.displayName} 认领工单`
      });
    });

    return this.getById(projectId, issueId);
  }

  reassign(projectId: string, issueId: string, input: ReassignIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "reassign issue");
    this.assertStatus(issue.status, ["open", "in_progress", "reopened"], "reassign issue");
    this.permission.assertCanReassign(issue, operatorId);
    const nextAssignee = this.permission.requireProjectMember(projectId, input.assigneeId.trim(), "reassign issue");
    const previousAssigneeId = issue.assigneeId?.trim() || null;
    const previousAssigneeName = issue.assigneeName?.trim() || null;

    this.repo.runInTransaction(() => {
      const changed = this.repo.update(projectId, issueId, {
        assigneeId: nextAssignee.userId,
        assigneeName: nextAssignee.displayName,
        updatedAt: nowIso()
      });
      if (!changed) {
        throw new AppError("ISSUE_REASSIGN_FAILED", "failed to reassign issue", 500);
      }
      this.participantRepo.delete(issue.id, nextAssignee.userId);
      if (previousAssigneeId && previousAssigneeId !== nextAssignee.userId && !this.participantRepo.hasParticipant(issue.id, previousAssigneeId)) {
        this.participantRepo.create({
          id: genId("ipt"),
          issueId: issue.id,
          userId: previousAssigneeId,
          userName: previousAssigneeName || previousAssigneeId,
          createdAt: nowIso()
        });
      }
      this.logService.record({
        issueId,
        actionType: "reassign",
        fromStatus: issue.status,
        toStatus: issue.status,
        operatorId,
        operatorName: input.operatorName?.trim() || null,
        summary: `重新指派给 ${nextAssignee.displayName}`
      });
    });

    return this.getById(projectId, issueId);
  }

  start(projectId: string, issueId: string, input: StartIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "start issue");
    this.assertStatus(issue.status, ["open", "reopened"], "start issue");
    if (!issue.assigneeId) {
      throw new AppError("ISSUE_ASSIGNEE_REQUIRED", "assignee is required before starting work", 400);
    }
    this.permission.assertCanStart(issue, operatorId);

    const nextStatus: IssueStatus = "in_progress";
    const changed = this.repo.update(projectId, issueId, {
      status: nextStatus,
      startedAt: nowIso(),
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("ISSUE_START_FAILED", "failed to start issue", 500);
    }
    this.logService.record({
      issueId,
      actionType: "start",
      fromStatus: issue.status,
      toStatus: nextStatus,
      operatorId,
      operatorName: input.operatorName?.trim() || null,
      summary: input.comment?.trim() || null
    });
    return this.getById(projectId, issueId);
  }

  resolve(projectId: string, issueId: string, input: ResolveIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "resolve issue");
    this.assertStatus(issue.status, ["in_progress"], "resolve issue");
    this.permission.assertCanResolve(issue, operatorId);

    const nextStatus: IssueStatus = "resolved";
    const summary = input.comment?.trim() || null;
    const changed = this.repo.update(projectId, issueId, {
      status: nextStatus,
      resolutionSummary: summary,
      resolvedAt: nowIso(),
      closedAt: null,
      closeReason: null,
      closeRemark: null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("ISSUE_RESOLVE_FAILED", "failed to resolve issue", 500);
    }
    this.logService.record({
      issueId,
      actionType: "resolve",
      fromStatus: issue.status,
      toStatus: nextStatus,
      operatorId,
      operatorName: input.operatorName?.trim() || null,
      summary: summary 
    });
    return this.getById(projectId, issueId);
  }

  verify(projectId: string, issueId: string, input: VerifyIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "verify issue");
    this.assertStatus(issue.status, ["resolved"], "verify issue");
    this.permission.assertCanVerify(issue, operatorId);

    const nextStatus: IssueStatus = "verified";
    const summary = input.comment?.trim() || null;
    const changed = this.repo.update(projectId, issueId, {
      status: nextStatus,
      closeRemark: null,
      closedAt: null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("ISSUE_VERIFY_FAILED", "failed to verify issue", 500);
    }
    this.logService.record({
      issueId,
      actionType: "verify",
      fromStatus: issue.status,
      toStatus: nextStatus,
      operatorId,
      operatorName: input.operatorName?.trim() || null,
      summary: summary
    });
    return this.getById(projectId, issueId);
  }

  reopen(projectId: string, issueId: string, input: ReopenIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "reopen issue");
    this.assertStatus(issue.status, ["resolved", "verified", "closed"], "reopen issue");
    this.permission.assertCanReopen(issue, operatorId);

    const nextStatus: IssueStatus = "reopened";
    const changed = this.repo.update(projectId, issueId, {
      status: nextStatus,
      reopenCount: issue.reopenCount + 1,
      resolvedAt: issue.resolvedAt,
      closedAt: null,
      closeReason: null,
      closeRemark: null,
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("ISSUE_REOPEN_FAILED", "failed to reopen issue", 500);
    }
    this.logService.record({
      issueId,
      actionType: "reopen",
      fromStatus: issue.status,
      toStatus: nextStatus,
      operatorId,
      operatorName: input.operatorName?.trim() || null,
      summary: input.comment?.trim() || "重新打开工单"
    });
    return this.getById(projectId, issueId);
  }

  close(projectId: string, issueId: string, input: CloseIssueInput): IssueEntity {
    const issue = this.getById(projectId, issueId);
    const operatorId = this.permission.requireOperatorId(input.operatorId, "close issue");
    this.assertStatus(issue.status, ["verified", "open", "reopened", "in_progress", "resolved"], "close issue");
    this.permission.assertCanClose(issue, operatorId);

    const changed = this.repo.update(projectId, issueId, {
      status: "closed",
      closeReason: input.closeReason?.trim() || issue.closeReason || null,
      closeRemark: "final_closed",
      closedAt: nowIso(),
      updatedAt: nowIso()
    });
    if (!changed) {
      throw new AppError("ISSUE_CLOSE_FAILED", "failed to close issue", 500);
    }
    this.logService.record({
      issueId,
      actionType: "close",
      fromStatus: issue.status,
      toStatus: "closed",
      operatorId,
      operatorName: input.operatorName?.trim() || null,
      summary: input.closeReason?.trim() || null
    });
    return this.getById(projectId, issueId);
  }

  listParticipants(projectId: string, issueId: string) {
    return this.participantService.list(projectId, issueId);
  }

  addParticipant(input: AddIssueParticipantInput) {
    return this.participantService.add(input);
  }

  removeParticipant(input: RemoveIssueParticipantInput) {
    return this.participantService.remove(input);
  }

  listComments(projectId: string, issueId: string) {
    return this.commentService.list(projectId, issueId);
  }

  addComment(input: CreateIssueCommentInput) {
    return this.commentService.create(input);
  }

  listAttachments(projectId: string, issueId: string) {
    return this.attachmentService.list(projectId, issueId);
  }

  createAttachment(input: CreateIssueAttachmentInput) {
    return this.attachmentService.create(input);
  }

  deleteAttachment(input: RemoveIssueAttachmentInput) {
    return this.attachmentService.remove(input);
  }

  getAttachment(projectId: string, issueId: string, attachmentId: string) {
    return this.attachmentService.get(projectId, issueId, attachmentId);
  }

  listActionLogs(projectId: string, issueId: string) {
    this.getById(projectId, issueId);
    return this.logService.list(issueId);
  }

  private attachParticipantNames(result: IssueListResult): IssueListResult {
    if (result.items.length === 0) {
      return result;
    }

    const participants = this.participantRepo.listByIssueIds(result.items.map((item) => item.id));
    const participantMap = new Map<string, string[]>();
    for (const participant of participants) {
      const current = participantMap.get(participant.issueId) ?? [];
      current.push(participant.userName);
      participantMap.set(participant.issueId, current);
    }

    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        participantNames: participantMap.get(item.id) ?? []
      }))
    };
  }

  private requireProject(projectId: string): void {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", `project not found: ${projectId}`, 404);
    }
  }

  private assertStatus(current: IssueStatus, allowed: readonly IssueStatus[], action: string): void {
    if (!allowed.includes(current)) {
      throw new AppError("ISSUE_INVALID_STATUS", `${action} is not allowed in status ${current}`, 400);
    }
  }

  private generateIssueNo(type: IssueEntity["type"]): string {
    const now = new Date();
    const date = [
      now.getFullYear().toString(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("");
    const time = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0")
    ].join("");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const prefix = ISSUE_NO_PREFIX[type] || "ISSUE";
    return `${prefix}-${date}-${time}${random}`;
  }
}
