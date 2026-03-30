import type { RequestContext } from "../../shared/context/request-context";
import type {
  ListNotificationsQuery,
  MarkNotificationReadsInput,
  MarkNotificationReadsResult,
  NotificationListResult
} from "./notification.types";

export interface NotificationQueryContract {
  list(query: ListNotificationsQuery, ctx: RequestContext): Promise<NotificationListResult>;
}

export interface NotificationCommandContract {
  markRead(input: MarkNotificationReadsInput, ctx: RequestContext): Promise<MarkNotificationReadsResult>;
}
