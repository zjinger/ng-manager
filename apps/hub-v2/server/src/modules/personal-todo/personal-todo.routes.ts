import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  createPersonalTodoSchema,
  createPersonalTodoTagSchema,
  updatePersonalTodoSchema,
  updatePersonalTodoStatusSchema,
  updatePersonalTodoTagSchema
} from "./personal-todo.schema";

export default async function personalTodoRoutes(app: FastifyInstance) {
  app.get("/personal-todos", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.personalTodoQuery.getSnapshot(ctx));
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
}

