export const frontendWorkflowStatuses = [
  "draft",
  "context-ready",
  "plan-ready",
  "patch-ready",
  "applied",
  "verified",
  "review-ready",
  "delivered",
  "failed",
] as const;

export type FrontendWorkflowStatus = typeof frontendWorkflowStatuses[number];
