import type { FastifyInstance } from "fastify";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import type { RequestContext } from "../../shared/context/request-context";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ok } from "../../shared/http/response";
import {
  createPersonalDocumentSchema,
  personalDocumentIdParamSchema,
  personalDocumentProjectParamSchema,
  publishPersonalDocumentSchema,
  updatePersonalDocumentSchema
} from "./personal-token.schema";
import type { DocumentEntity } from "../document/document.types";

export default async function personalTokenDocumentRoutes(app: FastifyInstance) {
  app.post("/projects/:projectKey/docs", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, "doc:create:write");
    const params = personalDocumentProjectParamSchema.parse(request.params);
    const body = createPersonalDocumentSchema.parse(request.body);
    const projectId = app.container.personalTokenQuery.resolveProjectId(params.projectKey);
    await requireTokenOwnerProjectMember(app, projectId, ctx.userId, "create document");
    const contentMd = body.contentMd?.trim() || body.content?.trim() || "";
    const categoryId = body.categoryId?.trim() || undefined;
    const category = body.category?.trim() || categoryId;

    const entity = await app.container.documentCommand.create(
      {
        projectId,
        slug: body.slug,
        title: body.title,
        category,
        summary: body.summary === null ? "" : body.summary,
        contentMd,
        version: body.version
      },
      ctx
    );

    app.container.apiTokenAuditLogCommand.create({
      tokenType: "personal",
      tokenId: ctx.tokenId ?? ctx.accountId,
      actorUserId: ctx.userId ?? null,
      projectId,
      projectKey: params.projectKey,
      action: "doc.create",
      resourceType: "doc",
      resourceId: entity.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: {
        title: entity.title,
        categoryId: categoryId ?? null,
        category: entity.category,
        summary: entity.summary,
        tags: body.tags ?? [],
        status: entity.status,
        source: body.source?.trim() || null,
        slug: entity.slug
      }
    });

    return reply.status(201).send(ok(toPersonalDocumentResponse(entity, categoryId), "document created"));
  });

  app.patch("/projects/:projectKey/docs/:docId", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "doc:update:write");
    const params = personalDocumentIdParamSchema.parse(request.params);
    const body = updatePersonalDocumentSchema.parse(request.body);
    const projectId = app.container.personalTokenQuery.resolveProjectId(params.projectKey);
    await requireTokenOwnerProjectMember(app, projectId, ctx.userId, "update document");
    const current = await requireDocumentInProject(app, params.docId, projectId, ctx);
    const contentMd = body.contentMd?.trim() || body.content?.trim();
    const categoryId = body.categoryId?.trim() || undefined;
    const category = body.category?.trim() || categoryId;

    const entity = await app.container.documentCommand.update(
      current.id,
      {
        projectId,
        slug: body.slug,
        title: body.title,
        category,
        summary: body.summary === null ? "" : body.summary,
        contentMd,
        version: body.version
      },
      ctx
    );

    app.container.apiTokenAuditLogCommand.create({
      tokenType: "personal",
      tokenId: ctx.tokenId ?? ctx.accountId,
      actorUserId: ctx.userId ?? null,
      projectId,
      projectKey: params.projectKey,
      action: "doc.update",
      resourceType: "doc",
      resourceId: entity.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: {
        title: entity.title,
        categoryId: categoryId ?? null,
        category: entity.category,
        summary: entity.summary,
        tags: body.tags ?? [],
        status: entity.status,
        source: body.source?.trim() || null,
        slug: entity.slug,
        contentUpdated: contentMd !== undefined
      }
    });

    return ok(toPersonalDocumentResponse(entity, categoryId), "document updated");
  });

  app.post("/projects/:projectKey/docs/:docId/publish", async (request) => {
    const ctx = requirePersonalTokenAuth(request, "doc:publish:write");
    const params = personalDocumentIdParamSchema.parse(request.params);
    const body = publishPersonalDocumentSchema.parse(request.body ?? {});
    const projectId = app.container.personalTokenQuery.resolveProjectId(params.projectKey);
    await requireTokenOwnerProjectMember(app, projectId, ctx.userId, "publish document");
    const current = await requireDocumentInProject(app, params.docId, projectId, ctx);

    const entity = await app.container.documentCommand.publish(current.id, ctx);

    app.container.apiTokenAuditLogCommand.create({
      tokenType: "personal",
      tokenId: ctx.tokenId ?? ctx.accountId,
      actorUserId: ctx.userId ?? null,
      projectId,
      projectKey: params.projectKey,
      action: "doc.publish",
      resourceType: "doc",
      resourceId: entity.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: {
        title: entity.title,
        category: entity.category,
        summary: entity.summary,
        status: entity.status,
        source: body.source?.trim() || null,
        slug: entity.slug
      }
    });

    return ok(toPersonalDocumentResponse(entity), "document published");
  });
}

async function requireTokenOwnerProjectMember(
  app: FastifyInstance,
  projectId: string,
  userId: string | null | undefined,
  action: string
): Promise<void> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
  }

  try {
    await app.container.projectAccess.requireProjectMember(projectId, normalizedUserId, action);
  } catch (error) {
    if (error instanceof AppError && error.code === ERROR_CODES.PROJECT_MEMBER_NOT_FOUND) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, `${action} forbidden`, 403);
    }
    throw error;
  }
}

async function requireDocumentInProject(
  app: FastifyInstance,
  docId: string,
  projectId: string,
  ctx: RequestContext
): Promise<DocumentEntity> {
  const entity = await app.container.documentQuery.getById(docId, ctx);
  if (entity.projectId !== projectId) {
    throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, `document not found: ${docId}`, 404);
  }
  return entity;
}

function toPersonalDocumentResponse(entity: DocumentEntity, categoryId?: string) {
  return {
    id: entity.id,
    title: entity.title,
    slug: entity.slug,
    category: entity.category,
    categoryId: categoryId ?? entity.category,
    status: entity.status,
    publishAt: entity.publishAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
}
