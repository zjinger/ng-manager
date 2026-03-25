import type { EventBus } from "../event/event-bus";
import type { DomainEvent } from "../event/domain-event";
import type { WsHub } from "./ws-hub";
import type { WsServerMessage } from "./ws.types";

function shouldNotify(event: DomainEvent): boolean {
  return (
    event.entityType === "issue" ||
    event.entityType === "rd" ||
    event.entityType === "announcement" ||
    event.entityType === "document" ||
    event.entityType === "release"
  );
}

function createMessages(event: DomainEvent): WsServerMessage[] {
  if (!shouldNotify(event)) {
    return [];
  }

  const ts = event.occurredAt || new Date().toISOString();
  const messages: WsServerMessage[] = [
    {
      type: "notification.changed",
      ts,
      projectId: event.projectId,
      payload: {
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action
      }
    }
  ];

  if (event.entityType === "issue" || event.entityType === "rd") {
    messages.push({
      type: "badge.changed",
      ts,
      projectId: event.projectId,
      payload: {
        entityType: event.entityType
      }
    });
  }

  return messages;
}

export function bindEventBusToWs(eventBus: EventBus, wsHub: WsHub): void {
  eventBus.subscribe("*", (event) => {
    const messages = createMessages(event);
    if (messages.length === 0) {
      return;
    }

    if (event.scope === "project" && event.projectId) {
      for (const message of messages) {
        wsHub.broadcastToProject(event.projectId, message);
      }
      return;
    }

    for (const message of messages) {
      wsHub.broadcast(message);
    }
  });
}
