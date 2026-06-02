import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { createRequestContext } from "../../shared/context/request-context";
import { PersonalTodoRepo } from "./personal-todo.repo";
import { createPersonalTodoSchema } from "./personal-todo.schema";
import { PersonalTodoService } from "./personal-todo.service";
import type { PromoteMarkdownUploadsInput, UploadCommandContract } from "../upload/upload.contract";

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
      folder_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES personal_todo_folders(id) ON DELETE SET NULL
    );

    CREATE TABLE personal_todo_folders (
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

const defaultQuery = {
  scope: "active" as const,
  page: 1,
  pageSize: 50,
  status: "all" as const,
  priority: "all" as const,
  tagId: "all" as const,
  folderId: "all" as const,
  keyword: "",
  groupBy: "status" as const
};

const recycleQuery = {
  ...defaultQuery,
  scope: "recycle" as const
};

function createUploadCommand(
  onPromote: (input: PromoteMarkdownUploadsInput) => void = () => {}
): UploadCommandContract {
  return {
    async create() {
      throw new Error("not implemented in personal todo tests");
    },
    async promoteMarkdownUploads(input) {
      onPromote(input);
    },
    async deactivateUpload() {}
  };
}

function createService(db: ReturnType<typeof createDb>, onPromote?: (input: PromoteMarkdownUploadsInput) => void): PersonalTodoService {
  return new PersonalTodoService(new PersonalTodoRepo(db), createUploadCommand(onPromote));
}

describe("PersonalTodoService", () => {
  it("initializes private default tags and sample todos", async () => {
    const db = createDb();
    try {
      const service = createService(db);

      const snapshot = await service.getSnapshot(defaultQuery, userOneCtx);

      assert.deepEqual(snapshot.tags.map((tag) => tag.name), ["工作", "个人", "学习", "紧急"]);
      assert.deepEqual(snapshot.folders.map((folder) => folder.name), ["工作", "学习", "生活"]);
      assert.equal(snapshot.items.length, 5);
      assert.equal(snapshot.recycleCount, 0);
      assert.equal(snapshot.items.some((todo) => todo.title === "整理本周工作计划"), true);
      assert.equal(snapshot.items.some((todo) => !!todo.folderId), true);

      const secondSnapshot = await service.getSnapshot(defaultQuery, userOneCtx);
      assert.equal(secondSnapshot.items.length, 5);
    } finally {
      db.close();
    }
  });

  it("seeds sample todos when default tags already exist", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      await service.createTag({ name: "工作", color: "blue" }, userOneCtx);
      await service.createTag({ name: "个人", color: "purple" }, userOneCtx);
      await service.createTag({ name: "学习", color: "green" }, userOneCtx);
      await service.createTag({ name: "紧急", color: "red" }, userOneCtx);

      const snapshot = await service.getSnapshot(defaultQuery, userOneCtx);
      assert.equal(snapshot.items.length, 5);
      assert.equal(snapshot.items.some((todo) => todo.tagIds.length > 0), true);

      await Promise.all(snapshot.items.map((todo) => service.deleteTodo(todo.id, userOneCtx)));
      const afterDeleteAll = await service.getSnapshot(defaultQuery, userOneCtx);
      assert.equal(afterDeleteAll.items.length, 0);
      assert.equal(afterDeleteAll.recycleCount, 5);
    } finally {
      db.close();
    }
  });

  it("keeps todos and tags isolated by current user", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const foreignTag = await service.createTag({ name: "他人标签", color: "gray" }, userTwoCtx);
      const ownTag = await service.createTag({ name: "我的标签", color: "blue" }, userOneCtx);
      const foreignFolder = await service.createFolder({ name: "他人文件夹", color: "gray" }, userTwoCtx);
      const ownFolder = await service.createFolder({ name: "我的文件夹", color: "blue" }, userOneCtx);

      const todo = await service.createTodo(
        {
          title: "  完成服务端同步  ",
          desc: "  使用接口保存  ",
          priority: "high",
          status: "todo",
          due: "2026-05-30",
          folderId: foreignFolder.id,
          tagIds: [ownTag.id, foreignTag.id]
        },
        userOneCtx
      );

      assert.equal(todo.title, "完成服务端同步");
      assert.deepEqual(todo.tagIds, [ownTag.id]);
      assert.equal(todo.folderId, null);

      const folderTodo = await service.createTodo(
        {
          title: "绑定文件夹",
          priority: "medium",
          status: "todo",
          due: null,
          folderId: ownFolder.id,
          tagIds: []
        },
        userOneCtx
      );
      assert.equal(folderTodo.folderId, ownFolder.id);

      const userOneSnapshot = await service.getSnapshot(defaultQuery, userOneCtx);
      const userTwoSnapshot = await service.getSnapshot(defaultQuery, userTwoCtx);
      assert.equal(userOneSnapshot.items.length, 2);
      assert.equal(userTwoSnapshot.items.length, 5);
      assert.equal(userOneSnapshot.tags.some((tag) => tag.id === foreignTag.id), false);
      assert.equal(userOneSnapshot.folders.some((folder) => folder.id === foreignFolder.id), false);
    } finally {
      db.close();
    }
  });

  it("promotes markdown uploads after create and update", async () => {
    const db = createDb();
    const promoted: PromoteMarkdownUploadsInput[] = [];
    try {
      const service = createService(db, (input) => promoted.push(input));

      const todo = await service.createTodo(
        {
          title: "带图待办",
          desc: "![a](/api/admin/uploads/upl_temp/raw)",
          priority: "medium",
          status: "todo",
          due: null,
          folderId: null,
          tagIds: []
        },
        userOneCtx
      );
      await service.updateTodo(
        todo.id,
        {
          title: "带图待办更新",
          desc: "![b](/api/admin/uploads/upl_temp_2/raw)",
          priority: "high",
          status: "doing",
          due: null,
          folderId: null,
          tagIds: []
        },
        userOneCtx
      );

      assert.deepEqual(promoted, [
        {
          content: "![a](/api/admin/uploads/upl_temp/raw)",
          bucket: "personal-todos",
          entityId: todo.id
        },
        {
          content: "![b](/api/admin/uploads/upl_temp_2/raw)",
          bucket: "personal-todos",
          entityId: todo.id
        }
      ]);
    } finally {
      db.close();
    }
  });

  it("returns paged and filtered todo query results with global counters", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const tag = await service.createTag({ name: "筛选", color: "blue" }, userOneCtx);
      const folder = await service.createFolder({ name: "分页文件夹", color: "green" }, userOneCtx);

      await service.createTodo(
        {
          title: "A 逾期进行中",
          desc: "alpha",
          priority: "critical",
          status: "doing",
          due: "2000-01-01",
          folderId: folder.id,
          tagIds: [tag.id]
        },
        userOneCtx
      );
      await service.createTodo(
        {
          title: "B keyword target",
          priority: "high",
          status: "todo",
          due: "2999-12-31",
          folderId: null,
          tagIds: [tag.id]
        },
        userOneCtx
      );
      await service.createTodo(
        {
          title: "C 已完成",
          priority: "low",
          status: "done",
          due: null,
          folderId: folder.id,
          tagIds: []
        },
        userOneCtx
      );

      const firstPage = await service.getSnapshot({ ...defaultQuery, pageSize: 2 }, userOneCtx);
      assert.equal(firstPage.total, 3);
      assert.equal(firstPage.items.length, 2);
      assert.deepEqual(firstPage.items.map((todo) => todo.title), ["A 逾期进行中", "B keyword target"]);
      assert.equal(firstPage.stats.total, 3);
      assert.equal(firstPage.stats.doing, 1);
      assert.equal(firstPage.stats.done, 1);
      assert.equal(firstPage.stats.overdue, 1);
      assert.equal(firstPage.folderCounts[folder.id], 2);
      assert.equal(firstPage.unfiledCount, 1);
      assert.equal(firstPage.unfinishedCount, 2);

      const secondPage = await service.getSnapshot({ ...defaultQuery, page: 2, pageSize: 2 }, userOneCtx);
      assert.deepEqual(secondPage.items.map((todo) => todo.title), ["C 已完成"]);

      const byStatus = await service.getSnapshot({ ...defaultQuery, status: "todo" }, userOneCtx);
      assert.deepEqual(byStatus.items.map((todo) => todo.title), ["B keyword target"]);

      const byTag = await service.getSnapshot({ ...defaultQuery, tagId: tag.id }, userOneCtx);
      assert.equal(byTag.total, 2);

      const byFolder = await service.getSnapshot({ ...defaultQuery, folderId: folder.id }, userOneCtx);
      assert.equal(byFolder.total, 2);
      assert.equal(byFolder.stats.total, 2);

      const unfiled = await service.getSnapshot({ ...defaultQuery, folderId: "none" }, userOneCtx);
      assert.deepEqual(unfiled.items.map((todo) => todo.title), ["B keyword target"]);

      const byKeyword = await service.getSnapshot({ ...defaultQuery, keyword: "target" }, userOneCtx);
      assert.deepEqual(byKeyword.items.map((todo) => todo.title), ["B keyword target"]);
    } finally {
      db.close();
    }
  });

  it("updates status, clears completed todos, and removes links when deleting tags", async () => {
    const db = createDb();
    try {
      const service = createService(db);
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
      const afterDeleteTag = await service.getSnapshot(defaultQuery, userOneCtx);
      assert.deepEqual(afterDeleteTag.items[0]?.tagIds, []);

      const done = await service.updateTodoStatus(todo.id, { status: "done" }, userOneCtx);
      assert.equal(done.status, "done");

      const cleared = await service.clearCompleted(userOneCtx);
      assert.equal(cleared.deleted, 1);
      const afterClear = await service.getSnapshot(defaultQuery, userOneCtx);
      assert.equal(afterClear.items.length, 0);
      assert.equal(afterClear.recycleCount, 1);
      const restored = await service.restoreTodo(todo.id, userOneCtx);
      assert.equal(restored.status, "done");
      assert.equal((await service.getSnapshot(defaultQuery, userOneCtx)).items.length, 1);
    } finally {
      db.close();
    }
  });

  it("rejects duplicate tag names for the same user", async () => {
    const db = createDb();
    try {
      const service = createService(db);
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

  it("manages folders and unfiles todos when deleting a folder", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const folder = await service.createFolder({ name: "项目", color: "green" }, userOneCtx);
      await assert.rejects(
        () => service.createFolder({ name: "项目", color: "blue" }, userOneCtx),
        /folder name already exists/
      );

      const updatedFolder = await service.updateFolder(folder.id, { name: "重点项目", color: "red" }, userOneCtx);
      assert.equal(updatedFolder.name, "重点项目");
      assert.equal(updatedFolder.color, "red");

      const todo = await service.createTodo(
        {
          title: "文件夹待办",
          priority: "high",
          status: "todo",
          due: null,
          folderId: folder.id,
          tagIds: []
        },
        userOneCtx
      );
      assert.equal(todo.folderId, folder.id);

      await service.deleteFolder(folder.id, userOneCtx);
      const snapshot = await service.getSnapshot(defaultQuery, userOneCtx);
      assert.equal(snapshot.items.find((item) => item.id === todo.id)?.folderId, null);
      assert.equal(snapshot.folders.some((item) => item.id === folder.id), false);
    } finally {
      db.close();
    }
  });

  it("permanently deletes recycled todos and empties recycle", async () => {
    const db = createDb();
    try {
      const service = createService(db);
      const first = await service.createTodo({
        title: "第一条",
        priority: "medium",
        status: "todo",
        due: null,
        tagIds: []
      }, userOneCtx);
      const second = await service.createTodo({
        title: "第二条",
        priority: "medium",
        status: "todo",
        due: null,
        tagIds: []
      }, userOneCtx);

      await service.deleteTodo(first.id, userOneCtx);
      await service.deleteTodo(second.id, userOneCtx);
      assert.equal((await service.getSnapshot(recycleQuery, userOneCtx)).items.length, 2);

      await service.permanentlyDeleteTodo(first.id, userOneCtx);
      assert.equal((await service.getSnapshot(recycleQuery, userOneCtx)).items.length, 1);

      const emptied = await service.emptyRecycle(userOneCtx);
      assert.equal(emptied.deleted, 1);
      assert.equal((await service.getSnapshot(recycleQuery, userOneCtx)).items.length, 0);
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
