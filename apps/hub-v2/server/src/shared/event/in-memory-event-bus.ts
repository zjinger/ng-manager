import type { DomainEvent, DomainEventHandler } from "./domain-event";
import type { EventBus } from "./event-bus";

export type EventBusLogger = {
  error(context: Record<string, unknown>, message: string): void;
};

type CreateInMemoryEventBusOptions = {
  logger?: EventBusLogger;
};

function normalizeError(reason: unknown): Record<string, unknown> {
  if (reason instanceof Error) {
    return {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    };
  }
  return { reason };
}

const fallbackLogger: EventBusLogger = {
  error(context, message) {
    console.error(message, context);
  }
};

export function createInMemoryEventBus(options: CreateInMemoryEventBusOptions = {}): EventBus {
  const logger = options.logger ?? fallbackLogger;
  const handlers = new Map<string, DomainEventHandler[]>();
  const queue: DomainEvent[] = [];
  let flushing = false;

  const getHandlers = (type: string): DomainEventHandler[] => handlers.get(type) ?? [];

  const flush = async (): Promise<void> => {
    if (flushing) {
      return;
    }
    flushing = true;
    try {
      while (queue.length > 0) {
        const event = queue.shift();
        if (!event) {
          continue;
        }

        const allHandlers = [...getHandlers(event.type), ...getHandlers("*")];
        if (allHandlers.length === 0) {
          continue;
        }

        const results = await Promise.allSettled(
          allHandlers.map((handler) =>
            Promise.resolve().then(async () => {
              await handler(event);
            })
          )
        );

        for (const result of results) {
          if (result.status === "rejected") {
            // Keep event dispatch isolated: one failing subscriber must not break others.
            logger.error(
              {
                eventType: event.type,
                scope: event.scope,
                projectId: event.projectId,
                entityType: event.entityType,
                entityId: event.entityId,
                action: event.action,
                ...normalizeError(result.reason)
              },
              "[event-bus] handler rejected"
            );
          }
        }
      }
    } finally {
      flushing = false;
      if (queue.length > 0) {
        setImmediate(() => {
          void flush();
        });
      }
    }
  };

  return {
    async emit(event: DomainEvent) {
      queue.push(event);
      setImmediate(() => {
        void flush();
      });
    },
    subscribe(type: string, handler: DomainEventHandler) {
      const current = handlers.get(type) ?? [];
      handlers.set(type, [...current, handler]);
      return () => {
        const latest = handlers.get(type) ?? [];
        const next = latest.filter((item) => item !== handler);
        if (next.length === 0) {
          handlers.delete(type);
          return;
        }
        handlers.set(type, next);
      };
    }
  };
}
