import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../app/build-container";
import errorHandlerPlugin from "../../plugins/error-handler.plugin";
import { createRequestContext } from "../../shared/context/request-context";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import type { MobileCommandContract, MobileQueryContract } from "./mobile.contract";
import type {
  MobileIssueActionInput,
  MobileMessageReadInput,
  MobileRdProgressInput,
  MobileTodoQuery
} from "./mobile.types";
import mobileRoutes from "./mobile.routes";

type TestCalls = {
  listTodos?: { query: MobileTodoQuery; ctx: RequestContext };
  getTodoDetail?: { targetType: string; targetId: string; ctx: RequestContext };
  issueAction?: { issueId: string; input: MobileIssueActionInput; ctx: RequestContext };
  rdProgress?: { itemId: string; input: MobileRdProgressInput; ctx: RequestContext };
  markMessagesRead?: { input: MobileMessageReadInput; ctx: RequestContext };
  todoDetailError?: Error;
};

const apps: FastifyInstance[] = [];

afterEach(async () => {
  while (apps.length > 0) {
    const app = apps.pop();
    if (app) {
      await app.close();
    }
  }
});

describe("mobile routes", () => {
  it("rejects anonymous requests", async () => {
    const { app } = await createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/mobile/bootstrap"
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, "AUTH_UNAUTHORIZED");
  });

  it("parses todo query and delegates pagination to mobile query service", async () => {
    const calls: TestCalls = {};
    const { app } = await createTestApp(calls);

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/mobile/todos?category=issue&page=2&pageSize=5&keyword=login",
      headers: authHeaders()
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.page, 2);
    assert.equal(calls.listTodos?.query.category, "issue");
    assert.equal(calls.listTodos?.query.page, 2);
    assert.equal(calls.listTodos?.query.pageSize, 5);
    assert.equal(calls.listTodos?.query.keyword, "login");
    assert.equal(calls.listTodos?.ctx.authType, "user");
  });

  it("returns unified issue detail", async () => {
    const calls: TestCalls = {};
    const { app } = await createTestApp(calls);

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/mobile/todos/issue/iss_1",
      headers: authHeaders()
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.targetType, "issue");
    assert.equal(calls.getTodoDetail?.targetType, "issue");
    assert.equal(calls.getTodoDetail?.targetId, "iss_1");
  });

  it("returns unified rd detail", async () => {
    const calls: TestCalls = {};
    const { app } = await createTestApp(calls);

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/mobile/todos/rd/rdi_1",
      headers: authHeaders()
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.targetType, "rd");
    assert.equal(calls.getTodoDetail?.targetType, "rd");
    assert.equal(calls.getTodoDetail?.targetId, "rdi_1");
  });

  it("propagates project permission errors from downstream services", async () => {
    const calls: TestCalls = {
      todoDetailError: new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "project access forbidden", 403)
    };
    const { app } = await createTestApp(calls);

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/mobile/todos/rd/rdi_forbidden",
      headers: authHeaders()
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "PROJECT_ACCESS_DENIED");
  });

  it("delegates issue actions and rd progress with request context", async () => {
    const calls: TestCalls = {};
    const { app } = await createTestApp(calls);

    const issueResponse = await app.inject({
      method: "POST",
      url: "/api/admin/mobile/issues/iss_1/actions",
      headers: authHeaders(),
      payload: { action: "resolve", note: "已修复" }
    });

    assert.equal(issueResponse.statusCode, 200);
    assert.equal(calls.issueAction?.issueId, "iss_1");
    assert.equal(calls.issueAction?.input.action, "resolve");
    assert.equal(calls.issueAction?.ctx.authType, "user");

    const progressResponse = await app.inject({
      method: "POST",
      url: "/api/admin/mobile/rd-items/rdi_1/progress",
      headers: authHeaders(),
      payload: { progress: 60, note: "联调中", stageTaskId: "task_1" }
    });

    assert.equal(progressResponse.statusCode, 200);
    assert.equal(calls.rdProgress?.itemId, "rdi_1");
    assert.equal(calls.rdProgress?.input.progress, 60);
    assert.equal(calls.rdProgress?.ctx.authType, "user");
  });

  it("delegates message read requests", async () => {
    const calls: TestCalls = {};
    const { app } = await createTestApp(calls);

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/mobile/messages/read",
      headers: authHeaders(),
      payload: { notificationIds: ["ntf_1", "ntf_2"] }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(calls.markMessagesRead?.input.notificationIds, ["ntf_1", "ntf_2"]);
    assert.equal(response.json().data.updated, 2);
  });
});

async function createTestApp(calls: TestCalls = {}) {
  const app = Fastify({ logger: false });
  app.decorateRequest("requestContext", null);
  app.decorate("container", createContainer(calls));
  app.addHook("onRequest", async (request) => {
    request.requestContext = createRequestContext({
      accountId: request.headers.authorization === "Bearer test" ? "adm_1" : "anonymous",
      userId: request.headers.authorization === "Bearer test" ? "usr_1" : null,
      nickname: request.headers.authorization === "Bearer test" ? "测试用户" : null,
      roles: request.headers.authorization === "Bearer test" ? ["admin"] : [],
      authType: request.headers.authorization === "Bearer test" ? "user" : "anonymous",
      source: "http",
      requestId: request.id,
      ip: request.ip
    });
  });
  await app.register(errorHandlerPlugin);
  await app.register(mobileRoutes, { prefix: "/api/admin" });
  await app.ready();
  apps.push(app);
  return { app };
}

function createContainer(calls: TestCalls): AppContainer {
  const mobileQuery: MobileQueryContract = {
    async getBootstrap() {
      return {
        profile: { accountId: "adm_1", userId: "usr_1", username: "admin", nickname: "测试用户", role: "admin" } as never,
        projects: [],
        currentProject: null,
        unreadCount: 0,
        capabilities: { canUseIssue: true, canUseRd: true, canUseMessages: true, canUseDocuments: true },
        defaultFilters: {
          todoCategories: ["all", "issue", "rd", "verify"],
          messageCategories: ["all", "issue", "rd", "announcement", "document", "release"]
        }
      };
    },
    async getDashboard() {
      return {
        stats: {
          todoTotal: 0,
          verifyTotal: 0,
          assignedIssues: 0,
          assignedRdItems: 0,
          inProgressRdItems: 0,
          unreadMessages: 0
        },
        todos: [],
        rdProgress: [],
        announcements: [],
        quickActions: []
      };
    },
    async listTodos(query, ctx) {
      calls.listTodos = { query, ctx };
      return {
        items: [],
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total: 0
      };
    },
    async getTodoDetail(targetType, targetId, ctx) {
      calls.getTodoDetail = { targetType, targetId, ctx };
      if (calls.todoDetailError) {
        throw calls.todoDetailError;
      }
      return {
        targetType,
        id: targetId,
        code: "ISS-1",
        title: "登录问题",
        status: "open",
        priority: "medium",
        projectId: "prj_1",
        descriptionMd: "详情",
        assigneeName: "测试用户",
        verifierName: null,
        progress: null,
        updatedAt: "2026-06-11T00:00:00.000Z",
        timeline: [],
        availableActions: ["start"]
      };
    },
    async listMessages(query) {
      return {
        items: [],
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total: 0,
        unreadTotal: 0
      };
    },
    async getMessageDetail(messageType, id) {
      return {
        id,
        messageType: messageType as never,
        title: "消息",
        markdown: "消息详情",
        projectId: null,
        publishedAt: "2026-06-11T00:00:00.000Z",
        unread: false
      };
    },
    async getConnection() {
      return {
        app: "hub-v2",
        env: "test",
        authenticated: true,
        profile: { accountId: "adm_1", userId: "usr_1", username: "admin", nickname: "测试用户", role: "admin" } as never,
        projectCount: 0,
        currentProject: null
      };
    }
  };
  const mobileCommand: MobileCommandContract = {
    async createIssueComment() {
      return { id: "cmt_1", content: "评论" } as never;
    },
    async runIssueAction(issueId, input, ctx) {
      calls.issueAction = { issueId, input, ctx };
      return { id: issueId } as never;
    },
    async updateRdProgress(itemId, input, ctx) {
      calls.rdProgress = { itemId, input, ctx };
      return { id: itemId } as never;
    },
    async runRdAction() {
      return { id: "rdi_1" } as never;
    },
    async markMessagesRead(input, ctx) {
      calls.markMessagesRead = { input, ctx };
      return { updated: input.notificationIds?.length ?? 0, unreadCount: 0 };
    }
  };

  return { mobileQuery, mobileCommand } as unknown as AppContainer;
}

function authHeaders() {
  return { authorization: "Bearer test" };
}
