export interface DomainEvent {
  type: string;
  scope: "global" | "project";
  projectId?: string;
  entityType: "announcement" | "document" | "release" | "issue" | "rd" | "project" | "system";
  entityId: string;
  action: string;
  actorId?: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}

export type DomainEventHandler = (event: DomainEvent) => Promise<void> | void;
