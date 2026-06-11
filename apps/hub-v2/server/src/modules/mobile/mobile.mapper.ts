import type { DashboardAnnouncementSummary, DashboardTodoItem } from "../dashboard/dashboard.types";
import type { IssueCommentEntity } from "../issue/comment/issue-comment.types";
import type { IssueEntity, IssueLogEntity } from "../issue/issue.types";
import type { NotificationItem } from "../notifications/notification.types";
import type { ProjectEntity } from "../project/project.types";
import type { RdItemEntity, RdLogEntity, RdStageTaskEntity, RdItemProgress } from "../rd/rd.types";
import type { AnnouncementEntity } from "../announcement/announcement.types";
import type { DocumentEntity } from "../document/document.types";
import type { ReleaseEntity } from "../release/release.types";
import type {
  MobileMessageCategory,
  MobileMessageDetail,
  MobileMessageItem,
  MobileProjectSummary,
  MobileTimelineItem,
  MobileTodoDetail,
  MobileTodoItem
} from "./mobile.types";

export function toMobileProject(project: ProjectEntity): MobileProjectSummary {
  return {
    id: project.id,
    projectKey: project.projectKey,
    name: project.name,
    displayCode: project.displayCode,
    avatarUrl: project.avatarUrl,
    favoriteAt: project.favoriteAt
  };
}

export function toMobileTodo(item: DashboardTodoItem): MobileTodoItem {
  const targetType = item.kind.startsWith("rd_") ? "rd" : "issue";
  return {
    id: `${targetType}:${item.entityId}`,
    targetType,
    targetId: item.entityId,
    code: item.code,
    title: item.title,
    status: item.status,
    priority: null,
    projectId: item.projectId,
    updatedAt: item.updatedAt,
    assigneeName: null,
    summary: item.kind,
    mobileRoute: `/todos/${targetType}/${item.entityId}`
  };
}

export function toMobileIssueDetail(
  issue: IssueEntity,
  comments: IssueCommentEntity[],
  logs: IssueLogEntity[]
): MobileTodoDetail {
  return {
    targetType: "issue",
    id: issue.id,
    code: issue.issueNo,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    projectId: issue.projectId,
    descriptionMd: issue.description,
    assigneeName: issue.assigneeName,
    verifierName: issue.verifierName,
    progress: null,
    updatedAt: issue.updatedAt,
    timeline: [
      ...comments.map(toMobileCommentTimeline),
      ...logs.map(toMobileIssueLogTimeline)
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    availableActions: issueActions(issue.status)
  };
}

export function toMobileRdDetail(
  item: RdItemEntity,
  logs: RdLogEntity[],
  progresses: RdItemProgress[],
  stageTasks: RdStageTaskEntity[]
): MobileTodoDetail {
  return {
    targetType: "rd",
    id: item.id,
    code: item.rdNo,
    title: item.title,
    status: item.status,
    priority: item.priority,
    projectId: item.projectId,
    descriptionMd: item.description,
    assigneeName: item.assigneeName,
    verifierName: item.verifierName,
    progress: item.progress,
    updatedAt: item.updatedAt,
    timeline: [
      ...stageTasks.map(toMobileStageTaskTimeline),
      ...progresses.map(toMobileProgressTimeline),
      ...logs.map(toMobileRdLogTimeline)
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    availableActions: rdActions(item.status)
  };
}

export function toMobileNotificationMessage(item: NotificationItem): MobileMessageItem {
  const category = notificationCategory(item.category);
  return {
    id: item.id,
    messageType: "notification",
    category,
    title: item.title,
    description: item.description,
    unread: item.unread,
    time: item.time,
    projectId: item.projectId,
    mobileRoute: `/messages/notification/${item.id}`
  };
}

export function toMobileAnnouncementMessage(item: DashboardAnnouncementSummary): MobileMessageItem {
  return {
    id: item.id,
    messageType: "announcement",
    category: "announcement",
    title: item.title,
    description: item.summary,
    unread: false,
    time: item.publishAt ?? "",
    projectId: item.projectId,
    mobileRoute: `/messages/announcement/${item.id}`
  };
}

export function toMobileAnnouncementDetail(item: AnnouncementEntity): MobileMessageDetail {
  return {
    id: item.id,
    messageType: "announcement",
    title: item.title,
    markdown: item.contentMd,
    projectId: item.projectId,
    publishedAt: item.publishAt,
    unread: false
  };
}

export function toMobileDocumentDetail(item: DocumentEntity): MobileMessageDetail {
  return {
    id: item.id,
    messageType: "document",
    title: item.title,
    markdown: item.contentMd,
    projectId: item.projectId,
    publishedAt: item.publishAt,
    unread: false
  };
}

export function toMobileReleaseDetail(item: ReleaseEntity): MobileMessageDetail {
  return {
    id: item.id,
    messageType: "release",
    title: item.title,
    markdown: item.notes ?? "",
    projectId: item.projectId,
    publishedAt: item.publishedAt,
    unread: false
  };
}

function toMobileCommentTimeline(comment: IssueCommentEntity): MobileTimelineItem {
  return {
    id: comment.id,
    kind: "comment",
    authorName: comment.authorName,
    content: comment.content,
    action: "comment",
    createdAt: comment.createdAt
  };
}

function toMobileIssueLogTimeline(log: IssueLogEntity): MobileTimelineItem {
  return {
    id: log.id,
    kind: "activity",
    authorName: log.operatorName,
    content: log.summary,
    action: log.actionType,
    createdAt: log.createdAt
  };
}

function toMobileRdLogTimeline(log: RdLogEntity): MobileTimelineItem {
  return {
    id: log.id,
    kind: "activity",
    authorName: log.operatorName,
    content: log.content,
    action: log.actionType,
    createdAt: log.createdAt
  };
}

function toMobileProgressTimeline(progress: RdItemProgress): MobileTimelineItem {
  return {
    id: progress.id,
    kind: "progress",
    authorName: progress.userName,
    content: progress.note,
    action: `progress:${progress.progress}`,
    createdAt: progress.updatedAt
  };
}

function toMobileStageTaskTimeline(task: RdStageTaskEntity): MobileTimelineItem {
  return {
    id: task.id,
    kind: "stage_task",
    authorName: task.ownerName,
    content: task.title,
    action: task.status,
    createdAt: task.updatedAt
  };
}

function issueActions(status: string): string[] {
  if (status === "open" || status === "reopened") return ["start", "wait_update", "close"];
  if (status === "in_progress" || status === "pending_update") return ["resolve", "close"];
  if (status === "resolved") return ["verify", "reopen"];
  return [];
}

function rdActions(status: string): string[] {
  if (status === "todo") return ["start", "block", "close"];
  if (status === "doing") return ["complete", "block", "close"];
  if (status === "blocked") return ["resume", "close"];
  if (status === "done") return ["accept", "reopen"];
  return [];
}

function notificationCategory(category: NotificationItem["category"]): MobileMessageCategory {
  if (category.startsWith("issue_")) return "issue";
  if (category.startsWith("rd_")) return "rd";
  if (category === "announcement") return "announcement";
  if (category === "document") return "document";
  if (category === "release") return "release";
  return "all";
}
