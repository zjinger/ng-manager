import { AppError } from "../../shared/errors/app-error";
import type { RdAction, RdItemStatus } from "./rd.types";

const transitions: Record<RdItemStatus, Partial<Record<RdAction, RdItemStatus>>> = {
  todo: {
    update: "todo",
    start: "doing",
    close: "closed"
  },
  doing: {
    update: "doing",
    block: "blocked",
    complete: "done",
    close: "closed"
  },
  blocked: {
    update: "blocked",
    resume: "doing",
    close: "closed"
  },
  done: {
    update: "done",
    accept: "accepted",
    block: "blocked",
    close: "closed"
  },
  accepted: {
    update: "accepted",
    close: "closed"
  },
  closed: {}
};

export function transitionRdItem(from: RdItemStatus, action: RdAction): RdItemStatus {
  const to = transitions[from][action];
  if (!to) {
    throw new AppError("RD_INVALID_TRANSITION", `cannot ${action} rd item from ${from}`, 400);
  }
  return to;
}
