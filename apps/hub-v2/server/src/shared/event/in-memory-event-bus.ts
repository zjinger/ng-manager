import type { DomainEvent, DomainEventHandler } from "./domain-event";
import type { EventBus } from "./event-bus";

export function createInMemoryEventBus(): EventBus {
  const handlers = new Map<string, DomainEventHandler[]>();

  return {
    async emit(event: DomainEvent) {
      const exactHandlers = handlers.get(event.type) ?? [];
      const wildcardHandlers = handlers.get("*") ?? [];

      for (const handler of [...exactHandlers, ...wildcardHandlers]) {
        await handler(event);
      }
    },
    subscribe(type: string, handler: DomainEventHandler) {
      const current = handlers.get(type) ?? [];
      handlers.set(type, [...current, handler]);
    }
  };
}
