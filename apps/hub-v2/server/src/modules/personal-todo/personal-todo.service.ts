import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { PersonalTodoCommandContract, PersonalTodoQueryContract } from "./personal-todo.contract";
import { PersonalTodoRepo } from "./personal-todo.repo";
import type {
  CreatePersonalTodoInput,
  CreatePersonalTodoTagInput,
  PersonalTodoEntity,
  PersonalTodoSnapshot,
  PersonalTodoTagColor,
  PersonalTodoTagEntity,
  UpdatePersonalTodoInput,
  UpdatePersonalTodoStatusInput,
  UpdatePersonalTodoTagInput
} from "./personal-todo.types";

const DEFAULT_TAGS: Array<{ name: string; color: PersonalTodoTagColor }> = [
  { name: "工作", color: "blue" },
  { name: "个人", color: "purple" },
  { name: "学习", color: "green" },
  { name: "紧急", color: "red" }
];

const DEFAULT_SAMPLE_TODOS: Array<{
  title: string;
  desc?: string;
  priority: PersonalTodoEntity["priority"];
  status: PersonalTodoEntity["status"];
  dueOffsetDays: number | null;
  tagNames: string[];
}> = [
  {
    title: "整理本周工作计划",
    desc: "把项目推进事项拆成可执行任务，同步到晨会。",
    priority: "high",
    status: "doing",
    dueOffsetDays: 0,
    tagNames: ["工作"]
  },
  {
    title: "准备客户演示材料",
    desc: "确认演示脚本、关键截图和风险说明。",
    priority: "critical",
    status: "todo",
    dueOffsetDays: 1,
    tagNames: ["工作", "紧急"]
  },
  {
    title: "复盘学习笔记",
    desc: "整理近期学到的工具、实践和可复用清单。",
    priority: "medium",
    status: "todo",
    dueOffsetDays: 3,
    tagNames: ["学习"]
  },
  {
    title: "预约体检时间",
    priority: "low",
    status: "todo",
    dueOffsetDays: 7,
    tagNames: ["个人"]
  },
  {
    title: "清理下载目录",
    priority: "low",
    status: "done",
    dueOffsetDays: -1,
    tagNames: ["个人"]
  }
];

export class PersonalTodoService implements PersonalTodoCommandContract, PersonalTodoQueryContract {
  constructor(private readonly repo: PersonalTodoRepo) {}

  async getSnapshot(ctx: RequestContext): Promise<PersonalTodoSnapshot> {
    const userId = this.requireUserId(ctx);
    const now = nowIso();
    this.repo.ensureInitialData(
      userId,
      this.buildDefaultTags(now),
      this.buildDefaultSampleTodos(now),
      now
    );
    return {
      todos: this.repo.listTodos(userId),
      tags: this.repo.listTags(userId)
    };
  }

  async createTodo(input: CreatePersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoEntity> {
    const userId = this.requireUserId(ctx);
    const now = nowIso();
    this.repo.ensureInitialData(userId, this.buildDefaultTags(now), [], now);
    const entity: PersonalTodoEntity = {
      id: genId("ptd"),
      title: input.title.trim(),
      desc: this.normalizeOptionalMarkdown(input.desc),
      priority: input.priority,
      status: input.status,
      due: input.due ?? null,
      tagIds: this.repo.filterOwnedTagIds(userId, input.tagIds),
      createdAt: now,
      updatedAt: now
    };
    this.repo.createTodo(entity, userId);
    return entity;
  }

  async updateTodo(id: string, input: UpdatePersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoEntity> {
    const userId = this.requireUserId(ctx);
    const existing = this.requireTodo(userId, id);
    const updated: PersonalTodoEntity = {
      ...existing,
      title: input.title.trim(),
      desc: this.normalizeOptionalMarkdown(input.desc),
      priority: input.priority,
      status: input.status,
      due: input.due ?? null,
      tagIds: this.repo.filterOwnedTagIds(userId, input.tagIds),
      updatedAt: nowIso()
    };
    if (!this.repo.updateTodo(updated, userId)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "failed to update personal todo", 500);
    }
    return this.requireTodo(userId, id);
  }

  async updateTodoStatus(id: string, input: UpdatePersonalTodoStatusInput, ctx: RequestContext): Promise<PersonalTodoEntity> {
    const userId = this.requireUserId(ctx);
    this.requireTodo(userId, id);
    if (!this.repo.updateTodoStatus(userId, id, input.status, nowIso())) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "failed to update personal todo status", 500);
    }
    return this.requireTodo(userId, id);
  }

  async deleteTodo(id: string, ctx: RequestContext): Promise<{ id: string }> {
    const userId = this.requireUserId(ctx);
    this.requireTodo(userId, id);
    this.repo.deleteTodo(userId, id);
    return { id };
  }

  async clearCompleted(ctx: RequestContext): Promise<{ deleted: number }> {
    const userId = this.requireUserId(ctx);
    return { deleted: this.repo.clearCompleted(userId) };
  }

  async createTag(input: CreatePersonalTodoTagInput, ctx: RequestContext): Promise<PersonalTodoTagEntity> {
    const userId = this.requireUserId(ctx);
    const now = nowIso();
    const name = input.name.trim();
    this.ensureTagNameAvailable(userId, name);
    const entity: PersonalTodoTagEntity = {
      id: genId("ptg"),
      name,
      color: input.color,
      sortOrder: this.repo.nextTagSortOrder(userId),
      createdAt: now,
      updatedAt: now
    };
    try {
      this.repo.createTag(entity, userId);
    } catch (error) {
      this.rethrowDuplicateTagName(error);
    }
    return entity;
  }

  async updateTag(id: string, input: UpdatePersonalTodoTagInput, ctx: RequestContext): Promise<PersonalTodoTagEntity> {
    const userId = this.requireUserId(ctx);
    const existing = this.requireTag(userId, id);
    const name = input.name?.trim() || existing.name;
    this.ensureTagNameAvailable(userId, name, id);
    const updated: PersonalTodoTagEntity = {
      ...existing,
      name,
      color: input.color ?? existing.color,
      updatedAt: nowIso()
    };
    try {
      if (!this.repo.updateTag(updated, userId)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "failed to update personal todo tag", 500);
      }
    } catch (error) {
      this.rethrowDuplicateTagName(error);
    }
    return this.requireTag(userId, id);
  }

  async deleteTag(id: string, ctx: RequestContext): Promise<{ id: string }> {
    const userId = this.requireUserId(ctx);
    this.requireTag(userId, id);
    this.repo.deleteTag(userId, id);
    return { id };
  }

  private buildDefaultTags(now: string): PersonalTodoTagEntity[] {
    return DEFAULT_TAGS.map((item, index) => ({
      id: genId("ptg"),
      name: item.name,
      color: item.color,
      sortOrder: index + 1,
      createdAt: now,
      updatedAt: now
    }));
  }

  private buildDefaultSampleTodos(now: string): Array<Omit<PersonalTodoEntity, "tagIds"> & { tagNames: string[] }> {
    return DEFAULT_SAMPLE_TODOS.map((sample) => ({
      id: genId("ptd"),
      title: sample.title,
      desc: sample.desc,
      priority: sample.priority,
      status: sample.status,
      due: sample.dueOffsetDays === null ? null : this.offsetDate(sample.dueOffsetDays),
      tagNames: sample.tagNames,
      createdAt: now,
      updatedAt: now
    }));
  }

  private ensureTagNameAvailable(userId: string, name: string, currentTagId?: string): void {
    const existing = this.repo.findTagByName(userId, name);
    if (existing && existing.id !== currentTagId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo tag name already exists", 409);
    }
  }

  private rethrowDuplicateTagName(error: unknown): never {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("personal_todo_tags.user_id, personal_todo_tags.name")) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo tag name already exists", 409);
    }
    throw error;
  }

  private requireTodo(userId: string, id: string): PersonalTodoEntity {
    const todo = this.repo.findTodoById(userId, id);
    if (!todo) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo not found", 404);
    }
    return todo;
  }

  private requireTag(userId: string, id: string): PersonalTodoTagEntity {
    const tag = this.repo.findTagById(userId, id);
    if (!tag) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo tag not found", 404);
    }
    return tag;
  }

  private requireUserId(ctx: RequestContext): string {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "user context required", 403);
    }
    return userId;
  }

  private normalizeOptionalMarkdown(value: string | undefined): string | undefined {
    const normalized = (value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 500);
    return normalized || undefined;
  }

  private offsetDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
