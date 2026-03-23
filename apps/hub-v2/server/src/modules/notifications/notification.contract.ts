import type { RequestContext } from "../../shared/context/request-context";
import type { ListNotificationsQuery, NotificationListResult } from "./notification.types";

export interface NotificationQueryContract {
  list(query: ListNotificationsQuery, ctx: RequestContext): Promise<NotificationListResult>;
}
