import { AppError } from "../../shared/errors/app-error";
import type { IssueAction, IssueStatus } from "./issue.types";

const transitions: Record<IssueStatus, Partial<Record<IssueAction, IssueStatus>>> = {
  open: {
    assign: "open",
    update: "open",
    start: "in_progress",
    close: "closed"
  },
  in_progress: {
    assign: "in_progress",
    update: "in_progress",
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
    update: "reopened",
    start: "in_progress",
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
    throw new AppError("ISSUE_INVALID_TRANSITION", `cannot ${action} issue from ${from}`, 400);
  }
  return to;
}
