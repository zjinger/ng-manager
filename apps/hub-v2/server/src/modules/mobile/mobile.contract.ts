import type { RequestContext } from "../../shared/context/request-context";
import type { IssueCommentEntity } from "../issue/comment/issue-comment.types";
import type { IssueEntity } from "../issue/issue.types";
import type { MarkNotificationReadsResult } from "../notifications/notification.types";
import type { RdItemEntity } from "../rd/rd.types";
import type {
  MobileBootstrap,
  MobileConnectionStatus,
  MobileDashboard,
  MobileIssueActionInput,
  MobileIssueCommentInput,
  MobileMessageDetail,
  MobileMessageListResult,
  MobileMessageQuery,
  MobileMessageReadInput,
  MobileRdActionInput,
  MobileRdProgressInput,
  MobileTodoDetail,
  MobileTodoListResult,
  MobileTodoQuery,
  MobileTargetType
} from "./mobile.types";

export interface MobileQueryContract {
  getBootstrap(ctx: RequestContext): Promise<MobileBootstrap>;
  getDashboard(ctx: RequestContext): Promise<MobileDashboard>;
  listTodos(query: MobileTodoQuery, ctx: RequestContext): Promise<MobileTodoListResult>;
  getTodoDetail(targetType: MobileTargetType, targetId: string, ctx: RequestContext): Promise<MobileTodoDetail>;
  listMessages(query: MobileMessageQuery, ctx: RequestContext): Promise<MobileMessageListResult>;
  getMessageDetail(messageType: string, id: string, ctx: RequestContext): Promise<MobileMessageDetail>;
  getConnection(ctx: RequestContext): Promise<MobileConnectionStatus>;
}

export interface MobileCommandContract {
  createIssueComment(issueId: string, input: MobileIssueCommentInput, ctx: RequestContext): Promise<IssueCommentEntity>;
  runIssueAction(issueId: string, input: MobileIssueActionInput, ctx: RequestContext): Promise<IssueEntity>;
  updateRdProgress(itemId: string, input: MobileRdProgressInput, ctx: RequestContext): Promise<RdItemEntity>;
  runRdAction(itemId: string, input: MobileRdActionInput, ctx: RequestContext): Promise<RdItemEntity>;
  markMessagesRead(input: MobileMessageReadInput, ctx: RequestContext): Promise<MarkNotificationReadsResult>;
}
