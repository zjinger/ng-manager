import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { PersonalTodoRepo } from "./personal-todo.repo";
import { createPersonalTodoSchema } from "./personal-todo.schema";
import { PersonalTodoService } from "./personal-todo.service";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL
    );

    CREATE TABLE personal_todo_tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE personal_todos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE personal_todo_tag_links (
      todo_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (todo_id, tag_id),
      FOREIGN KEY (todo_id) REFERENCES personal_todos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES personal_todo_tags(id) ON DELETE CASCADE
    );

    CREATE TABLE personal_todo_seed_state (
      user_id TEXT PRIMARY KEY,
      sample_todos_seeded_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.prepare("INSERT INTO users (id, username) VALUES (?, ?), (?, ?)").run("usr_1", "u1", "usr_2", "u2");
  return db;
}

const userOneCtx = createRequestContext({
  accountId: "acc_1",
  userId: "usr_1",
  roles: ["user"],
  source: "http"
});

const userTwoCtx = createRequestContext({
  accountId: "acc_2",
  userId: "usr_2",
  roles: ["user"],
  source: "http"
});

describe("PersonalTodoService", () => {
  it("initializes private default tags and sample todos", async () => {
    const db = createDb();
    try {
      const service = new PersonalTodoService(new PersonalTodoRepo(db));

      const snapshot = await service.getSnapshot(userOneCtx);

      assert.deepEqual(snapshot.tags.map((tag) => tag.name), ["工作", "个人", "学习", "紧急"]);
      assert.equal(snapshot.todos.length, 5);
      assert.equal(snapshot.todos.some((todo) => todo.title === "整理本周工作计划"), true);

      const secondSnapshot = await service.getSnapshot(userOneCtx);
      assert.equal(secondSnapshot.todos.length, 5);
    } finally {
      db.close();
    }
  });

  it("seeds sample todos when default tags already exist", async () => {
    const db = createDb();
    try {
      const service = new PersonalTodoService(new PersonalTodoRepo(db));
      await service.createTag({ name: "工作", color: "blue" }, userOneCtx);
      await service.createTag({ name: "个人", color: "purple" }, userOneCtx);
      await service.createTag({ name: "学习", color: "green" }, userOneCtx);
      await service.createTag({ name: "紧急", color: "red" }, userOneCtx);

      const snapshot = await service.getSnapshot(userOneCtx);
      assert.equal(snapshot.todos.length, 5);
      assert.equal(snapshot.todos.some((todo) => todo.tagIds.length > 0), true);

      await Promise.all(snapshot.todos.map((todo) => service.deleteTodo(todo.id, userOneCtx)));
      const afterDeleteAll = await service.getSnapshot(userOneCtx);
      assert.equal(afterDeleteAll.todos.length, 0);
    } finally {
      db.close();
    }
  });

  it("keeps todos and tags isolated by current user", async () => {
    const db = createDb();
    try {
      const service = new PersonalTodoService(new PersonalTodoRepo(db));
      const foreignTag = await service.createTag({ name: "他人标签", color: "gray" }, userTwoCtx);
      const ownTag = await service.createTag({ name: "我的标签", color: "blue" }, userOneCtx);

      const todo = await service.createTodo(
        {
          title: "  完成服务端同步  ",
          desc: "  使用接口保存  ",
          priority: "high",
          status: "todo",
          due: "2026-05-30",
          tagIds: [ownTag.id, foreignTag.id]
        },
        userOneCtx
      );

      assert.equal(todo.title, "完成服务端同步");
      assert.deepEqual(todo.tagIds, [ownTag.id]);

      const userOneSnapshot = await service.getSnapshot(userOneCtx);
      const userTwoSnapshot = await service.getSnapshot(userTwoCtx);
      assert.equal(userOneSnapshot.todos.length, 1);
      assert.equal(userTwoSnapshot.todos.length, 5);
      assert.equal(userOneSnapshot.tags.some((tag) => tag.id === foreignTag.id), false);
    } finally {
      db.close();
    }
  });

  it("updates status, clears completed todos, and removes links when deleting tags", async () => {
    const db = createDb();
    try {
      const service = new PersonalTodoService(new PersonalTodoRepo(db));
      const tag = await service.createTag({ name: "发布", color: "orange" }, userOneCtx);
      const todo = await service.createTodo(
        {
          title: "发布检查",
          priority: "critical",
          status: "doing",
          due: null,
          tagIds: [tag.id]
        },
        userOneCtx
      );

      const updatedTag = await service.updateTag(tag.id, { name: "上线", color: "red" }, userOneCtx);
      assert.equal(updatedTag.name, "上线");
      assert.equal(updatedTag.color, "red");

      await service.deleteTag(tag.id, userOneCtx);
      const afterDeleteTag = await service.getSnapshot(userOneCtx);
      assert.deepEqual(afterDeleteTag.todos[0]?.tagIds, []);

      const done = await service.updateTodoStatus(todo.id, { status: "done" }, userOneCtx);
      assert.equal(done.status, "done");

      const cleared = await service.clearCompleted(userOneCtx);
      assert.equal(cleared.deleted, 1);
      assert.equal((await service.getSnapshot(userOneCtx)).todos.length, 0);
    } finally {
      db.close();
    }
  });

  it("rejects duplicate tag names for the same user", async () => {
    const db = createDb();
    try {
      const service = new PersonalTodoService(new PersonalTodoRepo(db));
      const tag = await service.createTag({ name: "重复", color: "blue" }, userOneCtx);
      await service.createTag({ name: "另一个", color: "gray" }, userOneCtx);

      await assert.rejects(
        () => service.createTag({ name: "重复", color: "green" }, userOneCtx),
        /tag name already exists/
      );
      await assert.rejects(
        () => service.updateTag(tag.id, { name: "另一个" }, userOneCtx),
        /tag name already exists/
      );
    } finally {
      db.close();
    }
  });

  it("rejects invalid due dates", () => {
    assert.throws(() =>
      createPersonalTodoSchema.parse({
        title: "非法日期",
        priority: "medium",
        status: "todo",
        due: "2026-99-99",
        tagIds: []
      })
    );
  });
});
