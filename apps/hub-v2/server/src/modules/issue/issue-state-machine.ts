import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import type { IssueAction, IssueStatus } from "./issue.types";

const transitions: Record<IssueStatus, Partial<Record<IssueAction, IssueStatus>>> = {
  open: {
    assign: "open",
    claim: "open",
    update: "open",
    start: "in_progress",
    close: "closed"
  },
  in_progress: {
    assign: "in_progress",
    claim: "in_progress",
    update: "in_progress",
    wait_update: "pending_update",
    resolve: "resolved",
    close: "closed"
  },
  pending_update: {
    assign: "pending_update",
    claim: "pending_update",
    update: "pending_update",
    start: "in_progress",
    resolve: "resolved",
    close: "closed"
  },
  resolved: {
    update: "resolved",
    verify: "verified",
    reopen: "reopened",
    close: "closed"
  },
  verified: {
    update: "verified",
    reopen: "reopened",
    close: "closed"
  },
  reopened: {
    assign: "reopened",
    claim: "reopened",
    update: "reopened",
    start: "in_progress",
    wait_update: "pending_update",
    resolve: "resolved",
    close: "closed"
  },
  closed: {
    reopen: "reopened"
  }
};

export function transitionIssue(from: IssueStatus, action: IssueAction): IssueStatus {
  const to = transitions[from][action];
  if (!to) {
    throw new AppError(ERROR_CODES.ISSUE_INVALID_TRANSITION, `cannot ${action} issue from ${from}`, 400);
  }
  return to;
}
