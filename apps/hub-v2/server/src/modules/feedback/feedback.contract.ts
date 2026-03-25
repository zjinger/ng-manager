import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateFeedbackInput,
  FeedbackEntity,
  FeedbackListResult,
  ListFeedbacksQuery,
  UpdateFeedbackStatusInput
} from "./feedback.types";

export interface FeedbackCommandContract {
  submit(input: CreateFeedbackInput, ctx: RequestContext): Promise<FeedbackEntity>;
  changeStatus(id: string, input: UpdateFeedbackStatusInput, ctx: RequestContext): Promise<FeedbackEntity>;
}

export interface FeedbackQueryContract {
  list(query: ListFeedbacksQuery, ctx: RequestContext): Promise<FeedbackListResult>;
  getById(id: string, ctx: RequestContext): Promise<FeedbackEntity>;
}
