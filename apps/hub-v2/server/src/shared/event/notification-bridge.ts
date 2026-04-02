import type { NotificationIngestContract } from "../../modules/notifications/notification.contract";
import type { EventBus } from "./event-bus";
import type { WsHub } from "../ws/ws-hub";

export function bindEventBusToNotifications(
  eventBus: EventBus,
  notificationIngest: NotificationIngestContract,
  wsHub: WsHub
): void {
  // 专用通知桥接：
  // 在通知服务中持久化并进行收件人过滤，然后将增量项目推送给目标用户。
  eventBus.subscribe("*", async (event) => {
    const result = await notificationIngest.ingestDomainEvent(event);
    for (const delivered of result.delivered) {
      wsHub.broadcastToUsers([delivered.userId], {
        type: "notification.new",
        ts: delivered.item.time,
        projectId: delivered.item.projectId ?? undefined,
        payload: {
          notificationId: delivered.item.id,
          unreadCount: delivered.unreadCount,
          notification: delivered.item,
          entityType: event.entityType,
          entityId: event.entityId,
          action: event.action
        }
      });
    }
  });
}
