import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createPersonalTodoFolderSchema,
  createPersonalTodoSchema,
  createPersonalTodoTagSchema,
  listPersonalTodoQuerySchema,
  updatePersonalTodoFolderSchema,
  updatePersonalTodoSchema,
  updatePersonalTodoStatusSchema,
  updatePersonalTodoTagSchema
} from "./personal-todo.schema";

export default async function personalTodoRoutes(app: FastifyInstance) {
  app.get("/personal-todos", async (request) => {
    const ctx = requireAuth(request);
    const query = listPersonalTodoQuerySchema.parse(request.query);
    return ok(await app.container.personalTodoQuery.getSnapshot(query, ctx));
  });

  app.post("/personal-todos", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createPersonalTodoSchema.parse(request.body);
    const entity = await app.container.personalTodoCommand.createTodo(body, ctx);
    return reply.status(201).send(ok(entity, "personal todo created"));
  });

  app.patch("/personal-todos/:todoId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { todoId: string };
    const body = updatePersonalTodoSchema.parse(request.body);
    return ok(await app.container.personalTodoCommand.updateTodo(params.todoId, body, ctx), "personal todo updated");
  });

  app.patch("/personal-todos/:todoId/status", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { todoId: string };
    const body = updatePersonalTodoStatusSchema.parse(request.body);
    return ok(await app.container.personalTodoCommand.updateTodoStatus(params.todoId, body, ctx), "personal todo status updated");
  });

  app.delete("/personal-todos/completed", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.personalTodoCommand.clearCompleted(ctx), "completed personal todos cleared");
  });

  app.delete("/personal-todos/recycle", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.personalTodoCommand.emptyRecycle(ctx), "personal todo recycle emptied");
  });

  app.patch("/personal-todos/:todoId/restore", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { todoId: string };
    return ok(await app.container.personalTodoCommand.restoreTodo(params.todoId, ctx), "personal todo restored");
  });

  app.delete("/personal-todos/:todoId/permanent", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { todoId: string };
    return ok(await app.container.personalTodoCommand.permanentlyDeleteTodo(params.todoId, ctx), "personal todo permanently deleted");
  });

  app.delete("/personal-todos/:todoId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { todoId: string };
    return ok(await app.container.personalTodoCommand.deleteTodo(params.todoId, ctx), "personal todo deleted");
  });

  app.post("/personal-todo-tags", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createPersonalTodoTagSchema.parse(request.body);
    const entity = await app.container.personalTodoCommand.createTag(body, ctx);
    return reply.status(201).send(ok(entity, "personal todo tag created"));
  });

  app.patch("/personal-todo-tags/:tagId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { tagId: string };
    const body = updatePersonalTodoTagSchema.parse(request.body);
    return ok(await app.container.personalTodoCommand.updateTag(params.tagId, body, ctx), "personal todo tag updated");
  });

  app.delete("/personal-todo-tags/:tagId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { tagId: string };
    return ok(await app.container.personalTodoCommand.deleteTag(params.tagId, ctx), "personal todo tag deleted");
  });

  app.post("/personal-todo-folders", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createPersonalTodoFolderSchema.parse(request.body);
    const entity = await app.container.personalTodoCommand.createFolder(body, ctx);
    return reply.status(201).send(ok(entity, "personal todo folder created"));
  });

  app.patch("/personal-todo-folders/:folderId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { folderId: string };
    const body = updatePersonalTodoFolderSchema.parse(request.body);
    return ok(await app.container.personalTodoCommand.updateFolder(params.folderId, body, ctx), "personal todo folder updated");
  });

  app.delete("/personal-todo-folders/:folderId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { folderId: string };
    return ok(await app.container.personalTodoCommand.deleteFolder(params.folderId, ctx), "personal todo folder deleted");
  });
}
