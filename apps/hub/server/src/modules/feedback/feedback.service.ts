import { AppError } from "../../utils/app-error";
import { genId } from "../../utils/id";
import { nowIso } from "../../utils/time";
import type {
  CreateFeedbackInput,
  FeedbackEntity,
  FeedbackListResult,
  ListFeedbackQuery,
  UpdateFeedbackStatusInput
} from "./feedback.types";
import { FeedbackRepo } from "./feedback.repo";

export class FeedbackService {
  constructor(private readonly repo: FeedbackRepo) {}

  submit(input: CreateFeedbackInput): FeedbackEntity {
    const now = nowIso();

    const entity: FeedbackEntity = {
      id: genId("fb"),
      source: input.source,
      category: input.category,
      title: input.title.trim(),
      content: input.content.trim(),
      contact: input.contact?.trim() || null,
      clientName: input.clientName?.trim() || null,
      clientVersion: input.clientVersion?.trim() || null,
      osInfo: input.osInfo?.trim() || null,
      status: "open",
      createdAt: now,
      updatedAt: now
    };

    this.repo.create(entity);
    return entity;
  }

  getById(id: string): FeedbackEntity {
    const item = this.repo.findById(id);
    if (!item) {
      throw new AppError("FEEDBACK_NOT_FOUND", `feedback not found: ${id}`, 404);
    }
    return item;
  }

  list(query: ListFeedbackQuery): FeedbackListResult {
    return this.repo.list(query);
  }

  changeStatus(id: string, input: UpdateFeedbackStatusInput): FeedbackEntity {
    const exists = this.repo.findById(id);
    if (!exists) {
      throw new AppError("FEEDBACK_NOT_FOUND", `feedback not found: ${id}`, 404);
    }

    const changed = this.repo.updateStatus(id, input, nowIso());
    if (!changed) {
      throw new AppError("FEEDBACK_STATUS_UPDATE_FAILED", "failed to update feedback status", 500);
    }

    return this.getById(id);
  }
}