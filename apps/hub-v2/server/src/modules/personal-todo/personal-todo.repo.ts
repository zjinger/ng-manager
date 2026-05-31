import type Database from "better-sqlite3";

import type {
  ListPersonalTodoInput,
  PersonalTodoEntity,
  PersonalTodoFolderColor,
  PersonalTodoFolderEntity,
  PersonalTodoPriority,
  PersonalTodoStats,
  PersonalTodoStatus,
  PersonalTodoTagColor,
  PersonalTodoTagEntity
} from "./personal-todo.types";

type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type TagRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type FolderRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type LinkRow = {
  todo_id: string;
  tag_id: string;
};

type TodoWhere = {
  sql: string;
  params: unknown[];
};

type DefaultSampleTodo = Omit<PersonalTodoEntity, "tagIds" | "folderId"> & {
  tagNames: string[];
  folderName?: string;
};

export class PersonalTodoRepo {
  constructor(private readonly db: Database.Database) {}

  listTodos(userId: string): PersonalTodoEntity[] {
    return this.listTodosByDeletedState(userId, false);
  }

  listRecycleTodos(userId: string): PersonalTodoEntity[] {
    return this.listTodosByDeletedState(userId, true);
  }

  listTodoPage(userId: string, query: ListPersonalTodoInput): { items: PersonalTodoEntity[]; total: number } {
    const where = this.buildTodoWhere(userId, query, true);
    const offset = (query.page - 1) * query.pageSize;
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS total FROM personal_todos todos ${where.sql}`).get(...where.params) as { total: number };
    const rows = this.db
      .prepare(
        `
          SELECT todos.*
          FROM personal_todos todos
          ${where.sql}
          ${this.todoOrderBy(query.scope)}
          LIMIT ? OFFSET ?
        `
      )
      .all(...where.params, query.pageSize, offset) as TodoRow[];
    const todoIds = rows.map((row) => row.id);
    const tagIdsByTodoId = this.listTagIdsByTodoId(userId, todoIds);
    return {
      items: rows.map((row) => this.toTodoEntity(row, tagIdsByTodoId.get(row.id) ?? [])),
      total: totalRow.total
    };
  }

  getStats(userId: string, query: ListPersonalTodoInput, today: string): PersonalTodoStats {
    const where = this.buildTodoWhere(userId, query, false);
    const row = this.db
      .prepare(
        `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'doing' THEN 1 ELSE 0 END) AS doing,
            SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
            SUM(CASE WHEN due_date IS NOT NULL AND due_date < ? AND status <> 'done' THEN 1 ELSE 0 END) AS overdue
          FROM personal_todos todos
          ${where.sql}
        `
      )
      .get(today, ...where.params) as { total: number; doing: number | null; done: number | null; overdue: number | null };
    return {
      total: row.total,
      doing: row.doing ?? 0,
      done: row.done ?? 0,
      overdue: row.overdue ?? 0
    };
  }

  listFolderCounts(userId: string): Record<string, number> {
    const rows = this.db
      .prepare(
        `
          SELECT folder_id AS folderId, COUNT(*) AS total
          FROM personal_todos
          WHERE user_id = ?
            AND deleted_at IS NULL
            AND folder_id IS NOT NULL
          GROUP BY folder_id
        `
      )
      .all(userId) as Array<{ folderId: string; total: number }>;
    return Object.fromEntries(rows.map((row) => [row.folderId, row.total]));
  }

  countUnfiledTodos(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM personal_todos WHERE user_id = ? AND deleted_at IS NULL AND folder_id IS NULL")
      .get(userId) as { total: number };
    return row.total;
  }

  countRecycleTodos(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM personal_todos WHERE user_id = ? AND deleted_at IS NOT NULL")
      .get(userId) as { total: number };
    return row.total;
  }

  countUnfinishedTodos(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM personal_todos WHERE user_id = ? AND deleted_at IS NULL AND status <> 'done'")
      .get(userId) as { total: number };
    return row.total;
  }

  listTags(userId: string): PersonalTodoTagEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM personal_todo_tags
          WHERE user_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all(userId) as TagRow[];
    return rows.map((row) => this.toTagEntity(row));
  }

  listFolders(userId: string): PersonalTodoFolderEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM personal_todo_folders
          WHERE user_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all(userId) as FolderRow[];
    return rows.map((row) => this.toFolderEntity(row));
  }

  countTags(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM personal_todo_tags WHERE user_id = ?")
      .get(userId) as { total: number };
    return row.total;
  }

  countFolders(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM personal_todo_folders WHERE user_id = ?")
      .get(userId) as { total: number };
    return row.total;
  }

  countTodos(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM personal_todos WHERE user_id = ?")
      .get(userId) as { total: number };
    return row.total;
  }

  hasSeededSampleTodos(userId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 AS found FROM personal_todo_seed_state WHERE user_id = ?")
      .get(userId) as { found: number } | undefined;
    return !!row;
  }

  markSampleTodosSeeded(userId: string, seededAt: string): void {
    this.db
      .prepare(
        `
          INSERT INTO personal_todo_seed_state (user_id, sample_todos_seeded_at)
          VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET sample_todos_seeded_at = excluded.sample_todos_seeded_at
        `
      )
      .run(userId, seededAt);
  }

  nextTagSortOrder(userId: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextOrder FROM personal_todo_tags WHERE user_id = ?")
      .get(userId) as { nextOrder: number };
    return row.nextOrder;
  }

  nextFolderSortOrder(userId: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextOrder FROM personal_todo_folders WHERE user_id = ?")
      .get(userId) as { nextOrder: number };
    return row.nextOrder;
  }

  findTodoById(userId: string, id: string): PersonalTodoEntity | null {
    const row = this.db
      .prepare("SELECT * FROM personal_todos WHERE user_id = ? AND id = ?")
      .get(userId, id) as TodoRow | undefined;
    if (!row) {
      return null;
    }
    return this.toTodoEntity(row, this.listTagIdsForTodo(userId, id));
  }

  findTagById(userId: string, id: string): PersonalTodoTagEntity | null {
    const row = this.db
      .prepare("SELECT * FROM personal_todo_tags WHERE user_id = ? AND id = ?")
      .get(userId, id) as TagRow | undefined;
    return row ? this.toTagEntity(row) : null;
  }

  findTagByName(userId: string, name: string): PersonalTodoTagEntity | null {
    const row = this.db
      .prepare("SELECT * FROM personal_todo_tags WHERE user_id = ? AND name = ?")
      .get(userId, name) as TagRow | undefined;
    return row ? this.toTagEntity(row) : null;
  }

  findFolderById(userId: string, id: string): PersonalTodoFolderEntity | null {
    const row = this.db
      .prepare("SELECT * FROM personal_todo_folders WHERE user_id = ? AND id = ?")
      .get(userId, id) as FolderRow | undefined;
    return row ? this.toFolderEntity(row) : null;
  }

  findFolderByName(userId: string, name: string): PersonalTodoFolderEntity | null {
    const row = this.db
      .prepare("SELECT * FROM personal_todo_folders WHERE user_id = ? AND name = ?")
      .get(userId, name) as FolderRow | undefined;
    return row ? this.toFolderEntity(row) : null;
  }

  ensureInitialData(
    userId: string,
    defaultTags: PersonalTodoTagEntity[],
    defaultFolders: PersonalTodoFolderEntity[],
    sampleTodos: DefaultSampleTodo[],
    seededAt: string
  ): void {
    const seed = this.db.transaction(() => {
      if (this.countTags(userId) === 0) {
        for (const tag of defaultTags) {
          this.createTag(tag, userId);
        }
      }

      if (this.countFolders(userId) === 0) {
        for (const folder of defaultFolders) {
          this.createFolder(folder, userId);
        }
      }

      const hasSeeded = this.hasSeededSampleTodos(userId);
      if (hasSeeded) {
        return;
      }

      if (this.countTodos(userId) === 0) {
        const tagIdByName = new Map(this.listTags(userId).map((tag) => [tag.name, tag.id]));
        const folderIdByName = new Map(this.listFolders(userId).map((folder) => [folder.name, folder.id]));
        for (const sample of sampleTodos) {
          this.createTodo(
            {
              ...sample,
              folderId: sample.folderName ? folderIdByName.get(sample.folderName) ?? null : null,
              tagIds: sample.tagNames.map((name) => tagIdByName.get(name)).filter((id): id is string => !!id)
            },
            userId
          );
        }
      }

      this.markSampleTodosSeeded(userId, seededAt);
    });
    seed();
  }

  createTodo(entity: PersonalTodoEntity, userId: string): void {
    const insert = this.db.transaction(() => {
      this.db
        .prepare(
          `
            INSERT INTO personal_todos (
              id, user_id, title, description, priority, status, due_date, folder_id, created_at, updated_at, deleted_at
            ) VALUES (
              @id, @user_id, @title, @description, @priority, @status, @due_date, @folder_id, @created_at, @updated_at, @deleted_at
            )
          `
        )
        .run({
          id: entity.id,
          user_id: userId,
          title: entity.title,
          description: entity.desc ?? null,
          priority: entity.priority,
          status: entity.status,
          due_date: entity.due ?? null,
          folder_id: entity.folderId ?? null,
          created_at: entity.createdAt,
          updated_at: entity.updatedAt,
          deleted_at: entity.deletedAt ?? null
        });
      this.replaceTagLinks(entity.id, entity.tagIds);
    });
    insert();
  }

  updateTodo(entity: PersonalTodoEntity, userId: string): boolean {
    const update = this.db.transaction(() => {
      const result = this.db
        .prepare(
          `
            UPDATE personal_todos
            SET title = @title,
                description = @description,
                priority = @priority,
                status = @status,
                due_date = @due_date,
                folder_id = @folder_id,
                updated_at = @updated_at
            WHERE user_id = @user_id AND id = @id AND deleted_at IS NULL
          `
        )
        .run({
          id: entity.id,
          user_id: userId,
          title: entity.title,
          description: entity.desc ?? null,
          priority: entity.priority,
          status: entity.status,
          due_date: entity.due ?? null,
          folder_id: entity.folderId ?? null,
          updated_at: entity.updatedAt
        });
      if (result.changes > 0) {
        this.replaceTagLinks(entity.id, entity.tagIds);
      }
      return result.changes > 0;
    });
    return update();
  }

  updateTodoStatus(userId: string, id: string, status: PersonalTodoStatus, updatedAt: string): boolean {
    const result = this.db
      .prepare("UPDATE personal_todos SET status = ?, updated_at = ? WHERE user_id = ? AND id = ? AND deleted_at IS NULL")
      .run(status, updatedAt, userId, id);
    return result.changes > 0;
  }

  softDeleteTodo(userId: string, id: string, deletedAt: string): boolean {
    const result = this.db
      .prepare("UPDATE personal_todos SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND id = ? AND deleted_at IS NULL")
      .run(deletedAt, deletedAt, userId, id);
    return result.changes > 0;
  }

  clearCompleted(userId: string, deletedAt: string): number {
    const result = this.db
      .prepare("UPDATE personal_todos SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND status = 'done' AND deleted_at IS NULL")
      .run(deletedAt, deletedAt, userId);
    return result.changes;
  }

  restoreTodo(userId: string, id: string, updatedAt: string): boolean {
    const result = this.db
      .prepare("UPDATE personal_todos SET deleted_at = NULL, updated_at = ? WHERE user_id = ? AND id = ? AND deleted_at IS NOT NULL")
      .run(updatedAt, userId, id);
    return result.changes > 0;
  }

  permanentlyDeleteTodo(userId: string, id: string): boolean {
    const result = this.db.prepare("DELETE FROM personal_todos WHERE user_id = ? AND id = ? AND deleted_at IS NOT NULL").run(userId, id);
    return result.changes > 0;
  }

  emptyRecycle(userId: string): number {
    const result = this.db.prepare("DELETE FROM personal_todos WHERE user_id = ? AND deleted_at IS NOT NULL").run(userId);
    return result.changes;
  }

  createTag(entity: PersonalTodoTagEntity, userId: string): void {
    this.db
      .prepare(
        `
          INSERT INTO personal_todo_tags (
            id, user_id, name, color, sort_order, created_at, updated_at
          ) VALUES (
            @id, @user_id, @name, @color, @sort_order, @created_at, @updated_at
          )
        `
      )
      .run({
        id: entity.id,
        user_id: userId,
        name: entity.name,
        color: entity.color,
        sort_order: entity.sortOrder,
        created_at: entity.createdAt,
        updated_at: entity.updatedAt
      });
  }

  updateTag(entity: PersonalTodoTagEntity, userId: string): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE personal_todo_tags
          SET name = ?, color = ?, updated_at = ?
          WHERE user_id = ? AND id = ?
        `
      )
      .run(entity.name, entity.color, entity.updatedAt, userId, entity.id);
    return result.changes > 0;
  }

  deleteTag(userId: string, id: string): boolean {
    const result = this.db.prepare("DELETE FROM personal_todo_tags WHERE user_id = ? AND id = ?").run(userId, id);
    return result.changes > 0;
  }

  createFolder(entity: PersonalTodoFolderEntity, userId: string): void {
    this.db
      .prepare(
        `
          INSERT INTO personal_todo_folders (
            id, user_id, name, color, sort_order, created_at, updated_at
          ) VALUES (
            @id, @user_id, @name, @color, @sort_order, @created_at, @updated_at
          )
        `
      )
      .run({
        id: entity.id,
        user_id: userId,
        name: entity.name,
        color: entity.color,
        sort_order: entity.sortOrder,
        created_at: entity.createdAt,
        updated_at: entity.updatedAt
      });
  }

  updateFolder(entity: PersonalTodoFolderEntity, userId: string): boolean {
    const result = this.db
      .prepare(
        `
          UPDATE personal_todo_folders
          SET name = ?, color = ?, updated_at = ?
          WHERE user_id = ? AND id = ?
        `
      )
      .run(entity.name, entity.color, entity.updatedAt, userId, entity.id);
    return result.changes > 0;
  }

  deleteFolder(userId: string, id: string, updatedAt: string): boolean {
    const remove = this.db.transaction(() => {
      this.db
        .prepare("UPDATE personal_todos SET folder_id = NULL, updated_at = ? WHERE user_id = ? AND folder_id = ?")
        .run(updatedAt, userId, id);
      const result = this.db.prepare("DELETE FROM personal_todo_folders WHERE user_id = ? AND id = ?").run(userId, id);
      return result.changes > 0;
    });
    return remove();
  }

  filterOwnedTagIds(userId: string, tagIds: string[]): string[] {
    if (tagIds.length === 0) {
      return [];
    }
    const uniqueIds = Array.from(new Set(tagIds));
    const rows = this.db
      .prepare(
        `
          SELECT id
          FROM personal_todo_tags
          WHERE user_id = ?
            AND id IN (${uniqueIds.map(() => "?").join(",")})
        `
      )
      .all(userId, ...uniqueIds) as Array<{ id: string }>;
    const owned = new Set(rows.map((row) => row.id));
    return uniqueIds.filter((id) => owned.has(id));
  }

  filterOwnedFolderId(userId: string, folderId: string | null | undefined): string | null {
    const normalized = folderId?.trim();
    if (!normalized) {
      return null;
    }
    const row = this.db
      .prepare("SELECT id FROM personal_todo_folders WHERE user_id = ? AND id = ?")
      .get(userId, normalized) as { id: string } | undefined;
    return row?.id ?? null;
  }

  private listTodosByDeletedState(userId: string, deleted: boolean): PersonalTodoEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM personal_todos
          WHERE user_id = ?
            AND deleted_at IS ${deleted ? "NOT " : ""}NULL
          ORDER BY ${deleted ? "deleted_at DESC," : ""} created_at DESC
        `
      )
      .all(userId) as TodoRow[];
    const tagIdsByTodoId = this.listTagIdsByTodoId(userId);
    return rows.map((row) => this.toTodoEntity(row, tagIdsByTodoId.get(row.id) ?? []));
  }

  private buildTodoWhere(userId: string, query: ListPersonalTodoInput, includeToolbarFilters: boolean): TodoWhere {
    const clauses = ["todos.user_id = ?"];
    const params: unknown[] = [userId];

    clauses.push(query.scope === "recycle" ? "todos.deleted_at IS NOT NULL" : "todos.deleted_at IS NULL");

    if (query.folderId && query.folderId !== "all") {
      if (query.folderId === "none") {
        clauses.push("todos.folder_id IS NULL");
      } else {
        clauses.push("todos.folder_id = ?");
        params.push(query.folderId);
      }
    }

    if (includeToolbarFilters) {
      if (query.status && query.status !== "all") {
        clauses.push("todos.status = ?");
        params.push(query.status);
      }

      if (query.priority && query.priority !== "all") {
        clauses.push("todos.priority = ?");
        params.push(query.priority);
      }

      if (query.tagId && query.tagId !== "all") {
        clauses.push(
          "EXISTS (SELECT 1 FROM personal_todo_tag_links links INNER JOIN personal_todo_tags tags ON tags.id = links.tag_id WHERE links.todo_id = todos.id AND tags.user_id = ? AND links.tag_id = ?)"
        );
        params.push(userId, query.tagId);
      }

      const keyword = query.keyword?.trim();
      if (keyword) {
        const like = `%${this.escapeLike(keyword)}%`;
        clauses.push("(todos.title LIKE ? ESCAPE '\\' OR COALESCE(todos.description, '') LIKE ? ESCAPE '\\')");
        params.push(like, like);
      }
    }

    return {
      sql: `WHERE ${clauses.join(" AND ")}`,
      params
    };
  }

  private todoOrderBy(scope: ListPersonalTodoInput["scope"]): string {
    if (scope === "recycle") {
      return "ORDER BY todos.deleted_at DESC, todos.updated_at DESC";
    }

    return `
      ORDER BY
        CASE todos.status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END ASC,
        CASE todos.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC,
        CASE WHEN todos.due_date IS NULL THEN 1 ELSE 0 END ASC,
        todos.due_date ASC,
        todos.created_at DESC
    `;
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
  }

  private listTagIdsByTodoId(userId: string, todoIds?: string[]): Map<string, string[]> {
    if (todoIds && todoIds.length === 0) {
      return new Map();
    }
    const todoFilter = todoIds ? `AND links.todo_id IN (${todoIds.map(() => "?").join(",")})` : "";
    const rows = this.db
      .prepare(
        `
          SELECT links.todo_id, links.tag_id
          FROM personal_todo_tag_links links
          INNER JOIN personal_todos todos ON todos.id = links.todo_id
          INNER JOIN personal_todo_tags tags ON tags.id = links.tag_id
          WHERE todos.user_id = ?
            AND tags.user_id = ?
            ${todoFilter}
          ORDER BY tags.sort_order ASC, tags.created_at ASC
        `
      )
      .all(userId, userId, ...(todoIds ?? [])) as LinkRow[];
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.todo_id) ?? [];
      list.push(row.tag_id);
      map.set(row.todo_id, list);
    }
    return map;
  }

  private listTagIdsForTodo(userId: string, todoId: string): string[] {
    const rows = this.db
      .prepare(
        `
          SELECT links.tag_id
          FROM personal_todo_tag_links links
          INNER JOIN personal_todos todos ON todos.id = links.todo_id
          INNER JOIN personal_todo_tags tags ON tags.id = links.tag_id
          WHERE todos.user_id = ?
            AND tags.user_id = ?
            AND links.todo_id = ?
          ORDER BY tags.sort_order ASC, tags.created_at ASC
        `
      )
      .all(userId, userId, todoId) as Array<{ tag_id: string }>;
    return rows.map((row) => row.tag_id);
  }

  private replaceTagLinks(todoId: string, tagIds: string[]): void {
    this.db.prepare("DELETE FROM personal_todo_tag_links WHERE todo_id = ?").run(todoId);
    const statement = this.db.prepare("INSERT INTO personal_todo_tag_links (todo_id, tag_id) VALUES (?, ?)");
    for (const tagId of tagIds) {
      statement.run(todoId, tagId);
    }
  }

  private toTodoEntity(row: TodoRow, tagIds: string[]): PersonalTodoEntity {
    return {
      id: row.id,
      title: row.title,
      desc: row.description ?? undefined,
      priority: row.priority as PersonalTodoPriority,
      status: row.status as PersonalTodoStatus,
      due: row.due_date,
      folderId: row.folder_id,
      tagIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    };
  }

  private toTagEntity(row: TagRow): PersonalTodoTagEntity {
    return {
      id: row.id,
      name: row.name,
      color: row.color as PersonalTodoTagColor,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toFolderEntity(row: FolderRow): PersonalTodoFolderEntity {
    return {
      id: row.id,
      name: row.name,
      color: row.color as PersonalTodoFolderColor,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
