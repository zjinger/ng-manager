import type { FastifyInstance } from "fastify";
import { requirePersonalTokenAuth } from "../../shared/auth/require-personal-token-auth";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ok } from "../../shared/http/response";
import {
  createPersonalDocumentSchema,
  personalDocumentProjectParamSchema
} from "./personal-token.schema";

export default async function personalTokenDocumentRoutes(app: FastifyInstance) {
  app.post("/projects/:projectKey/docs", async (request, reply) => {
    const ctx = requirePersonalTokenAuth(request, "doc:create:write");
    const params = personalDocumentProjectParamSchema.parse(request.params);
    const body = createPersonalDocumentSchema.parse(request.body);
    const projectId = app.container.personalTokenQuery.resolveProjectId(params.projectKey);
    await requireTokenOwnerProjectMember(app, projectId, ctx.userId);
    const contentMd = body.contentMd?.trim() || body.content?.trim() || "";
    const categoryId = body.categoryId?.trim() || undefined;
    const category = body.category?.trim() || categoryId;

    const entity = await app.container.documentCommand.create(
      {
        projectId,
        slug: body.slug,
        title: body.title,
        category,
        summary: body.summary,
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

    return reply.status(201).send(
      ok(
        {
          id: entity.id,
          title: entity.title,
          slug: entity.slug,
          category: entity.category,
          categoryId: categoryId ?? entity.category,
          status: entity.status,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        },
        "document created"
      )
    );
  });
}

async function requireTokenOwnerProjectMember(
  app: FastifyInstance,
  projectId: string,
  userId: string | null | undefined
): Promise<void> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "create document forbidden", 403);
  }

  try {
    await app.container.projectAccess.requireProjectMember(projectId, normalizedUserId, "create document");
  } catch (error) {
    if (error instanceof AppError && error.code === ERROR_CODES.PROJECT_MEMBER_NOT_FOUND) {
      throw new AppError(ERROR_CODES.PROJECT_ACCESS_DENIED, "create document forbidden", 403);
    }
    throw error;
  }
}
