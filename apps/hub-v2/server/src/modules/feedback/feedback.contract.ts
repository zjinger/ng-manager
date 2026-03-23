import type { RequestContext } from "../../shared/context/request-context";
import type { FeedbackEntity, FeedbackListResult, ListFeedbacksQuery } from "./feedback.types";

export interface FeedbackQueryContract {
  list(query: ListFeedbacksQuery, ctx: RequestContext): Promise<FeedbackListResult>;
  getById(id: string, ctx: RequestContext): Promise<FeedbackEntity>;
}
