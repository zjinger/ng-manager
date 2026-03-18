import type { FastifyInstance } from "fastify";
import {
  createDocumentSchema,
  listDocumentQuerySchema,
  publishDocumentSchema,
  updateDocumentSchema
} from "../../modules/document/document.schema";
import { DocumentEntity } from "../../modules/document/document.types";
import { AppError } from "../../utils/app-error";
import { ok } from "../../utils/response";

function isPublishedDocument(item: DocumentEntity): boolean {
  if (!item) return false;
  if (item.status === "published") return true;
  return false;
}

type Operator = {
  operatorId: string;
  operatorName: string;
};

function getOperator(request: {
  adminUser: { id: string; userId?: string | null; nickname?: string | null; username: string } | null;
}): Operator {
  if (!request.adminUser) {
    throw new AppError("AUTH_UNAUTHORIZED", "unauthorized", 401);
  }

  return {
    operatorId: request.adminUser.userId?.trim() || request.adminUser.id,
    operatorName: request.adminUser.nickname?.trim() || request.adminUser.username
  };
}

function assertCanViewDocument(
  fastify: FastifyInstance,
  operatorId: string,
  document: { projectId?: string | null }
): void {
  if (fastify.services.projectMember.isAdmin(operatorId)) {
    return;
  }

  if (!document.projectId) {
    return;
  }

  const memberProjectIds = new Set(fastify.services.projectMember.listProjectIdsByUserId(operatorId));
  if (memberProjectIds.has(document.projectId)) {
    return;
  }

  throw new AppError("DOCUMENT_FORBIDDEN", "no permission to view document", 403);
}

function assertCanManageDocument(
  fastify: FastifyInstance,
  operatorId: string,
  document: { projectId?: string | null },
  action: string
): void {
  if (!document.projectId) {
    if (fastify.services.projectMember.isAdmin(operatorId)) {
      return;
    }
    throw new AppError("DOCUMENT_ADMIN_REQUIRED", `${action} requires admin permission`, 403);
  }

  fastify.services.projectMember.assertCanManageProject(document.projectId, operatorId, action);
}

export default async function adminDocumentRoutes(fastify: FastifyInstance) {
  fastify.get("/documents", async (request) => {
    const query = listDocumentQuerySchema.parse(request.query);
    const operator = getOperator(request);

    if (fastify.services.projectMember.isAdmin(operator.operatorId)) {
      const result = fastify.services.document.list({
        projectId: query.projectId,
        status: query.status,
        category: query.category,
        keyword: query.keyword,
        page: query.page,
        pageSize: query.pageSize
      });
      return ok(result);
    }

    const memberProjectIds = fastify.services.projectMember.listProjectIdsByUserId(operator.operatorId);
    if (query.projectId && !memberProjectIds.includes(query.projectId)) {
      return ok({
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0
      });
    }

    const result = fastify.services.document.listByProjectIds(
      memberProjectIds,
      {
        projectId: query.projectId,
        status: query.status,
        category: query.category,
        keyword: query.keyword,
        page: query.page,
        pageSize: query.pageSize
      },
      { includeGlobal: true }
    );

    return ok(result);
  });

  fastify.get("/documents/:id", async (request) => {
    const params = request.params as { id: string };
    const operator = getOperator(request);
    const item = fastify.services.document.getById(params.id);
    assertCanViewDocument(fastify, operator.operatorId, item);
    return ok(item);
  });

  fastify.post("/documents", async (request, reply) => {
    const body = createDocumentSchema.parse(request.body);
    const operator = getOperator(request);
    const isAdmin = fastify.services.projectMember.isAdmin(operator.operatorId);

    if (!isAdmin && !body.projectId) {
      throw new AppError("DOCUMENT_PROJECT_REQUIRED", "projectId is required for non-admin document creation", 400);
    }

    if (body.projectId) {
      fastify.services.projectMember.assertCanManageProject(body.projectId, operator.operatorId, "create document");
    }

    const item = fastify.services.document.create({
      projectId: body.projectId ?? null,
      slug: body.slug,
      title: body.title,
      category: body.category,
      summary: body.summary,
      contentMd: body.contentMd,
      version: body.version,
      createdBy: operator.operatorId
    });

    return reply.status(201).send(ok(item, "document created"));
  });

  fastify.put("/documents/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateDocumentSchema.parse(request.body);
    const operator = getOperator(request);
    const existing = fastify.services.document.getById(params.id);
    const isAdmin = fastify.services.projectMember.isAdmin(operator.operatorId);

    assertCanManageDocument(fastify, operator.operatorId, existing, "edit document");

    if (!isAdmin && body.projectId === null) {
      throw new AppError("DOCUMENT_PROJECT_REQUIRED", "projectId is required for non-admin document editing", 400);
    }

    if (body.projectId !== undefined && body.projectId !== null) {
      fastify.services.projectMember.assertCanManageProject(body.projectId, operator.operatorId, "edit document");
    }

    const item = fastify.services.document.update(params.id, {
      projectId: body.projectId,
      slug: body.slug,
      title: body.title,
      category: body.category,
      summary: body.summary,
      contentMd: body.contentMd,
      version: body.version
    });

    if (isPublishedDocument(item)) {
      fastify.log.info(
        {
          event: "doc.updated",
          id: item.id,
          title: item.title,
          projectId: item.projectId ?? null
        },
        "[hub-ws] emit doc updated"
      );

      fastify.hubWsEvents.docUpdated({
        id: item.id,
        title: item.title,
        projectId: item.projectId ?? null
      });
    }

    return ok(item, "document updated");
  });

  fastify.post("/documents/:id/publish", async (request) => {
    const params = request.params as { id: string };
    const operator = getOperator(request);
    publishDocumentSchema.parse(request.body ?? {});
    const existing = fastify.services.document.getById(params.id);

    assertCanManageDocument(fastify, operator.operatorId, existing, "publish document");

    const item = fastify.services.document.publish(params.id);

    fastify.log.info(
      {
        event: "doc.published",
        id: item.id,
        title: item.title,
        projectId: item.projectId ?? null
      },
      "[hub-ws] emit doc published"
    );

    fastify.hubWsEvents.docPublished({
      id: item.id,
      title: item.title,
      projectId: item.projectId ?? null
    });

    return ok(item, "document published");
  });

  fastify.post("/documents/:id/archive", async (request) => {
    const params = request.params as { id: string };
    const operator = getOperator(request);
    const existing = fastify.services.document.getById(params.id);

    assertCanManageDocument(fastify, operator.operatorId, existing, "archive document");

    const item = fastify.services.document.archive(params.id);
    return ok(item, "document archived");
  });

  fastify.delete("/documents/:id", async (request) => {
    const params = request.params as { id: string };
    const operator = getOperator(request);
    const existing = fastify.services.document.getById(params.id);

    assertCanManageDocument(fastify, operator.operatorId, existing, "delete document");
    fastify.services.document.remove(params.id);

    return ok({ id: params.id }, "document deleted");
  });
}
