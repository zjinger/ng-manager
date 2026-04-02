import type { RequestContext } from "../../shared/context/request-context";
import type { DomainEvent } from "../../shared/event/domain-event";
import type {
  NotificationIngestResult,
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

export interface NotificationIngestContract {
  ingestDomainEvent(event: DomainEvent): Promise<NotificationIngestResult>;
}
