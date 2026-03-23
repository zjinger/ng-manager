import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { requireAdmin } from "../utils/require-admin";
import type { FeedbackQueryContract } from "./feedback.contract";
import { FeedbackRepo } from "./feedback.repo";
import type { FeedbackEntity, FeedbackListResult, ListFeedbacksQuery } from "./feedback.types";

export class FeedbackService implements FeedbackQueryContract {
  constructor(private readonly repo: FeedbackRepo) {}

  async list(query: ListFeedbacksQuery, ctx: RequestContext): Promise<FeedbackListResult> {
    requireAdmin(ctx);
    return this.repo.list(query);
  }

  async getById(id: string, ctx: RequestContext): Promise<FeedbackEntity> {
    requireAdmin(ctx);
    const feedback = this.repo.findById(id);
    if (!feedback) {
      throw new AppError("FEEDBACK_NOT_FOUND", `feedback not found: ${id}`, 404);
    }
    return feedback;
  }
}
