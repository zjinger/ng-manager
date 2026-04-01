import type { DomainEvent, DomainEventHandler } from "./domain-event";

export interface EventBus {
  emit(event: DomainEvent): Promise<void>;
  subscribe(type: string, handler: DomainEventHandler): () => void;
}
