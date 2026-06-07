import type { FrontendWorkflowStatus } from "./workflow-status";

export class WorkflowTransitionError extends Error {
  constructor(
    readonly from: FrontendWorkflowStatus,
    readonly to: FrontendWorkflowStatus
  ) {
    super(`Illegal workflow status transition: ${from} -> ${to}`);
  }
}

const allowedTransitions: Record<FrontendWorkflowStatus, FrontendWorkflowStatus[]> = {
  draft: ["context-ready", "plan-ready", "failed"],
  "context-ready": ["plan-ready", "failed"],
  "plan-ready": ["patch-ready", "applied", "failed"],
  "patch-ready": ["applied", "failed"],
  applied: ["verified", "failed"],
  verified: ["review-ready", "delivered", "failed"],
  "review-ready": ["delivered", "failed"],
  delivered: [],
  failed: ["draft"],
};

export function canTransitionWorkflowStatus(from: FrontendWorkflowStatus, to: FrontendWorkflowStatus): boolean {
  if (from === to) return true;
  return allowedTransitions[from].includes(to);
}

export function assertWorkflowTransition(from: FrontendWorkflowStatus, to: FrontendWorkflowStatus): void {
  if (!canTransitionWorkflowStatus(from, to)) {
    throw new WorkflowTransitionError(from, to);
  }
}

export function workflowTransitionReason(from: FrontendWorkflowStatus, to: FrontendWorkflowStatus): string {
  return `illegal workflow status transition: ${from} -> ${to}`;
}
