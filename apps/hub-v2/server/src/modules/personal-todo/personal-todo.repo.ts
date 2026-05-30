import type Database from "better-sqlite3";

import type {
  PersonalTodoEntity,
  PersonalTodoPriority,
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
  created_at: string;
  updated_at: string;
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

type LinkRow = {
  todo_id: string;
  tag_id: string;
};

type DefaultSampleTodo = Omit<PersonalTodoEntity, "tagIds"> & {
  tagNames: string[];
};

export class PersonalTodoRepo {
  constructor(private readonly db: Database.Database) {}

  listTodos(userId: string): PersonalTodoEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM personal_todos
          WHERE user_id = ?
          ORDER BY created_at DESC
        `
      )
      .all(userId) as TodoRow[];
    const tagIdsByTodoId = this.listTagIdsByTodoId(userId);
    return rows.map((row) => this.toTodoEntity(row, tagIdsByTodoId.get(row.id) ?? []));
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

  countTags(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM personal_todo_tags WHERE user_id = ?")
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

  ensureInitialData(userId: string, defaultTags: PersonalTodoTagEntity[], sampleTodos: DefaultSampleTodo[], seededAt: string): void {
    const seed = this.db.transaction(() => {
      if (this.countTags(userId) === 0) {
        for (const tag of defaultTags) {
          this.createTag(tag, userId);
        }
      }

      const hasSeeded = this.hasSeededSampleTodos(userId);
      if (hasSeeded) {
        return;
      }

      if (this.countTodos(userId) === 0) {
        const tagIdByName = new Map(this.listTags(userId).map((tag) => [tag.name, tag.id]));
        for (const sample of sampleTodos) {
          this.createTodo(
            {
              ...sample,
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
              id, user_id, title, description, priority, status, due_date, created_at, updated_at
            ) VALUES (
              @id, @user_id, @title, @description, @priority, @status, @due_date, @created_at, @updated_at
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
          created_at: entity.createdAt,
          updated_at: entity.updatedAt
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
                updated_at = @updated_at
            WHERE user_id = @user_id AND id = @id
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
      .prepare("UPDATE personal_todos SET status = ?, updated_at = ? WHERE user_id = ? AND id = ?")
      .run(status, updatedAt, userId, id);
    return result.changes > 0;
  }

  deleteTodo(userId: string, id: string): boolean {
    const result = this.db.prepare("DELETE FROM personal_todos WHERE user_id = ? AND id = ?").run(userId, id);
    return result.changes > 0;
  }

  clearCompleted(userId: string): number {
    const result = this.db.prepare("DELETE FROM personal_todos WHERE user_id = ? AND status = 'done'").run(userId);
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

  private listTagIdsByTodoId(userId: string): Map<string, string[]> {
    const rows = this.db
      .prepare(
        `
          SELECT links.todo_id, links.tag_id
          FROM personal_todo_tag_links links
          INNER JOIN personal_todos todos ON todos.id = links.todo_id
          INNER JOIN personal_todo_tags tags ON tags.id = links.tag_id
          WHERE todos.user_id = ?
            AND tags.user_id = ?
          ORDER BY tags.sort_order ASC, tags.created_at ASC
        `
      )
      .all(userId, userId) as LinkRow[];
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
      tagIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
}
