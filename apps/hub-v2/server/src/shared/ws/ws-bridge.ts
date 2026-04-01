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
        action: event.action,
        hints: ["notification", "dashboard"],
        affectedUserIds: extractAffectedUserIds(event)
      }
    },
    {
      type: "dashboard.changed",
      ts,
      projectId: event.projectId,
      payload: {
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        hints: ["dashboard"]
      }
    }
  ];

  if (event.entityType === "issue" || event.entityType === "rd") {
    messages.push({
      type: "badge.changed",
      ts,
      projectId: event.projectId,
      payload: {
        entityType: event.entityType,
        hints: ["badge"]
      }
    });
  }

  return messages;
}

function extractAffectedUserIds(event: DomainEvent): string[] {
  const payload = event.payload ?? {};
  const ids = new Set<string>();

  const pick = (value: unknown): void => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        ids.add(trimmed);
      }
    }
  };

  const pickMany = (value: unknown): void => {
    if (!Array.isArray(value)) {
      return;
    }
    for (const item of value) {
      pick(item);
    }
  };

  pick(payload["assigneeId"]);
  pick(payload["reporterId"]);
  pick(payload["verifierId"]);
  pick(payload["reviewerId"]);
  pick(payload["creatorId"]);
  pick(payload["authorId"]);
  pick(payload["userId"]);
  pickMany(payload["userIds"]);
  pickMany(payload["mentionedUserIds"]);
  pickMany(payload["participantUserIds"]);
  pickMany(payload["affectedUserIds"]);

  return Array.from(ids);
}

export function bindEventBusToWs(eventBus: EventBus, wsHub: WsHub): void {
  eventBus.subscribe("*", (event) => {
    const messages = createMessages(event);
    if (messages.length === 0) {
      return;
    }

    const affectedUserIds = extractAffectedUserIds(event);
    if (affectedUserIds.length > 0) {
      for (const message of messages) {
        wsHub.broadcastToUsers(affectedUserIds, message);
      }
      return;
    }

    if (event.scope === "project" && event.projectId) {
      for (const message of messages) {
        wsHub.broadcastToProjectMembers(event.projectId, message);
      }
      return;
    }

    for (const message of messages) {
      wsHub.broadcast(message);
    }
  });
}
