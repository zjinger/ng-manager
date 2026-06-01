import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { UploadCommandContract } from "../upload/upload.contract";
import type { PersonalTodoCommandContract, PersonalTodoQueryContract } from "./personal-todo.contract";
import { PersonalTodoRepo } from "./personal-todo.repo";
import type {
  CreatePersonalTodoFolderInput,
  CreatePersonalTodoInput,
  CreatePersonalTodoTagInput,
  ListPersonalTodoInput,
  PersonalTodoEntity,
  PersonalTodoFolderColor,
  PersonalTodoFolderEntity,
  PersonalTodoSnapshot,
  PersonalTodoTagColor,
  PersonalTodoTagEntity,
  UpdatePersonalTodoFolderInput,
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

const DEFAULT_FOLDERS: Array<{ name: string; color: PersonalTodoFolderColor }> = [
  { name: "工作", color: "blue" },
  { name: "学习", color: "green" },
  { name: "生活", color: "purple" }
];

const DEFAULT_SAMPLE_TODOS: Array<{
  title: string;
  desc?: string;
  priority: PersonalTodoEntity["priority"];
  status: PersonalTodoEntity["status"];
  dueOffsetDays: number | null;
  tagNames: string[];
  folderName?: string;
}> = [
  {
    title: "整理本周工作计划",
    desc: "把项目推进事项拆成可执行待办，同步到晨会。",
    priority: "high",
    status: "doing",
    dueOffsetDays: 0,
    tagNames: ["工作"],
    folderName: "工作"
  },
  {
    title: "准备客户演示材料",
    desc: "确认演示脚本、关键截图和风险说明。",
    priority: "critical",
    status: "todo",
    dueOffsetDays: 1,
    tagNames: ["工作", "紧急"],
    folderName: "工作"
  },
  {
    title: "复盘学习笔记",
    desc: "整理近期学到的工具、实践和可复用清单。",
    priority: "medium",
    status: "todo",
    dueOffsetDays: 3,
    tagNames: ["学习"],
    folderName: "学习"
  },
  {
    title: "预约体检时间",
    priority: "low",
    status: "todo",
    dueOffsetDays: 7,
    tagNames: ["个人"],
    folderName: "生活"
  },
  {
    title: "清理下载目录",
    priority: "low",
    status: "done",
    dueOffsetDays: -1,
    tagNames: ["个人"],
    folderName: "生活"
  }
];

export class PersonalTodoService implements PersonalTodoCommandContract, PersonalTodoQueryContract {
  constructor(
    private readonly repo: PersonalTodoRepo,
    private readonly uploadCommand: UploadCommandContract
  ) {}

  async getSnapshot(input: ListPersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoSnapshot> {
    const userId = this.requireUserId(ctx);
    const now = nowIso();
    this.repo.ensureInitialData(
      userId,
      this.buildDefaultTags(now),
      this.buildDefaultFolders(now),
      this.buildDefaultSampleTodos(now),
      now
    );
    const page = this.repo.listTodoPage(userId, input);
    return {
      items: page.items,
      total: page.total,
      page: input.page,
      pageSize: input.pageSize,
      tags: this.repo.listTags(userId),
      folders: this.repo.listFolders(userId),
      stats: this.repo.getStats(userId, input, this.todayIso()),
      folderCounts: this.repo.listFolderCounts(userId),
      unfiledCount: this.repo.countUnfiledTodos(userId),
      recycleCount: this.repo.countRecycleTodos(userId),
      unfinishedCount: this.repo.countUnfinishedTodos(userId)
    };
  }

  async createTodo(input: CreatePersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoEntity> {
    const userId = this.requireUserId(ctx);
    const now = nowIso();
    this.repo.ensureInitialData(userId, this.buildDefaultTags(now), this.buildDefaultFolders(now), [], now);
    const entity: PersonalTodoEntity = {
      id: genId("ptd"),
      title: input.title.trim(),
      desc: this.normalizeOptionalMarkdown(input.desc),
      priority: input.priority,
      status: input.status,
      due: input.due ?? null,
      folderId: this.repo.filterOwnedFolderId(userId, input.folderId),
      tagIds: this.repo.filterOwnedTagIds(userId, input.tagIds),
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    this.repo.createTodo(entity, userId);
    await this.promoteTempMarkdownUploads(entity.id, entity.desc ?? null, ctx);
    return entity;
  }

  async updateTodo(id: string, input: UpdatePersonalTodoInput, ctx: RequestContext): Promise<PersonalTodoEntity> {
    const userId = this.requireUserId(ctx);
    const existing = this.requireActiveTodo(userId, id);
    const updated: PersonalTodoEntity = {
      ...existing,
      title: input.title.trim(),
      desc: this.normalizeOptionalMarkdown(input.desc),
      priority: input.priority,
      status: input.status,
      due: input.due ?? null,
      folderId: this.repo.filterOwnedFolderId(userId, input.folderId),
      tagIds: this.repo.filterOwnedTagIds(userId, input.tagIds),
      updatedAt: nowIso()
    };
    if (!this.repo.updateTodo(updated, userId)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "failed to update personal todo", 500);
    }
    const entity = this.requireActiveTodo(userId, id);
    await this.promoteTempMarkdownUploads(entity.id, entity.desc ?? null, ctx);
    return entity;
  }

  async updateTodoStatus(id: string, input: UpdatePersonalTodoStatusInput, ctx: RequestContext): Promise<PersonalTodoEntity> {
    const userId = this.requireUserId(ctx);
    this.requireActiveTodo(userId, id);
    if (!this.repo.updateTodoStatus(userId, id, input.status, nowIso())) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "failed to update personal todo status", 500);
    }
    return this.requireActiveTodo(userId, id);
  }

  async deleteTodo(id: string, ctx: RequestContext): Promise<{ id: string }> {
    const userId = this.requireUserId(ctx);
    this.requireActiveTodo(userId, id);
    this.repo.softDeleteTodo(userId, id, nowIso());
    return { id };
  }

  async clearCompleted(ctx: RequestContext): Promise<{ deleted: number }> {
    const userId = this.requireUserId(ctx);
    return { deleted: this.repo.clearCompleted(userId, nowIso()) };
  }

  async restoreTodo(id: string, ctx: RequestContext): Promise<PersonalTodoEntity> {
    const userId = this.requireUserId(ctx);
    this.requireRecycledTodo(userId, id);
    if (!this.repo.restoreTodo(userId, id, nowIso())) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "failed to restore personal todo", 500);
    }
    return this.requireActiveTodo(userId, id);
  }

  async permanentlyDeleteTodo(id: string, ctx: RequestContext): Promise<{ id: string }> {
    const userId = this.requireUserId(ctx);
    this.requireRecycledTodo(userId, id);
    this.repo.permanentlyDeleteTodo(userId, id);
    return { id };
  }

  async emptyRecycle(ctx: RequestContext): Promise<{ deleted: number }> {
    const userId = this.requireUserId(ctx);
    return { deleted: this.repo.emptyRecycle(userId) };
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

  async createFolder(input: CreatePersonalTodoFolderInput, ctx: RequestContext): Promise<PersonalTodoFolderEntity> {
    const userId = this.requireUserId(ctx);
    const now = nowIso();
    const name = input.name.trim();
    this.ensureFolderNameAvailable(userId, name);
    const entity: PersonalTodoFolderEntity = {
      id: genId("ptf"),
      name,
      color: input.color,
      sortOrder: this.repo.nextFolderSortOrder(userId),
      createdAt: now,
      updatedAt: now
    };
    try {
      this.repo.createFolder(entity, userId);
    } catch (error) {
      this.rethrowDuplicateFolderName(error);
    }
    return entity;
  }

  async updateFolder(id: string, input: UpdatePersonalTodoFolderInput, ctx: RequestContext): Promise<PersonalTodoFolderEntity> {
    const userId = this.requireUserId(ctx);
    const existing = this.requireFolder(userId, id);
    const name = input.name?.trim() || existing.name;
    this.ensureFolderNameAvailable(userId, name, id);
    const updated: PersonalTodoFolderEntity = {
      ...existing,
      name,
      color: input.color ?? existing.color,
      updatedAt: nowIso()
    };
    try {
      if (!this.repo.updateFolder(updated, userId)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, "failed to update personal todo folder", 500);
      }
    } catch (error) {
      this.rethrowDuplicateFolderName(error);
    }
    return this.requireFolder(userId, id);
  }

  async deleteFolder(id: string, ctx: RequestContext): Promise<{ id: string }> {
    const userId = this.requireUserId(ctx);
    this.requireFolder(userId, id);
    this.repo.deleteFolder(userId, id, nowIso());
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

  private buildDefaultFolders(now: string): PersonalTodoFolderEntity[] {
    return DEFAULT_FOLDERS.map((item, index) => ({
      id: genId("ptf"),
      name: item.name,
      color: item.color,
      sortOrder: index + 1,
      createdAt: now,
      updatedAt: now
    }));
  }

  private buildDefaultSampleTodos(now: string): Array<Omit<PersonalTodoEntity, "tagIds" | "folderId"> & { tagNames: string[]; folderName?: string }> {
    return DEFAULT_SAMPLE_TODOS.map((sample) => ({
      id: genId("ptd"),
      title: sample.title,
      desc: sample.desc,
      priority: sample.priority,
      status: sample.status,
      due: sample.dueOffsetDays === null ? null : this.offsetDate(sample.dueOffsetDays),
      tagNames: sample.tagNames,
      folderName: sample.folderName,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }));
  }

  private ensureTagNameAvailable(userId: string, name: string, currentTagId?: string): void {
    const existing = this.repo.findTagByName(userId, name);
    if (existing && existing.id !== currentTagId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo tag name already exists", 409);
    }
  }

  private ensureFolderNameAvailable(userId: string, name: string, currentFolderId?: string): void {
    const existing = this.repo.findFolderByName(userId, name);
    if (existing && existing.id !== currentFolderId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo folder name already exists", 409);
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

  private rethrowDuplicateFolderName(error: unknown): never {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("personal_todo_folders.user_id, personal_todo_folders.name")) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo folder name already exists", 409);
    }
    throw error;
  }

  private requireActiveTodo(userId: string, id: string): PersonalTodoEntity {
    const todo = this.requireTodo(userId, id);
    if (todo.deletedAt) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo not found", 404);
    }
    return todo;
  }

  private requireRecycledTodo(userId: string, id: string): PersonalTodoEntity {
    const todo = this.requireTodo(userId, id);
    if (!todo.deletedAt) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo recycle item not found", 404);
    }
    return todo;
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

  private requireFolder(userId: string, id: string): PersonalTodoFolderEntity {
    const folder = this.repo.findFolderById(userId, id);
    if (!folder) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "personal todo folder not found", 404);
    }
    return folder;
  }

  private requireUserId(ctx: RequestContext): string {
    const userId = ctx.userId?.trim();
    if (!userId) {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "user context required", 403);
    }
    return userId;
  }

  private normalizeOptionalMarkdown(value: string | undefined): string | undefined {
    const normalized = (value ?? "").replace(/\r\n?/g, "\n").trim();
    return normalized || undefined;
  }

  private async promoteTempMarkdownUploads(todoId: string, desc: string | null, ctx: RequestContext): Promise<void> {
    await this.uploadCommand.promoteMarkdownUploads(
      {
        content: desc,
        bucket: "personal-todos",
        entityId: todoId
      },
      ctx
    );
  }

  private offsetDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private todayIso(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
