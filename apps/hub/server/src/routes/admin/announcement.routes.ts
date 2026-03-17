import type { FastifyInstance } from "fastify";
import {
  createAnnouncementSchema,
  listAnnouncementQuerySchema,
  publishAnnouncementSchema,
  updateAnnouncementSchema
} from "../../modules/announcement/announcement.schema";
import { AppError } from "../../utils/app-error";
import { ok } from "../../utils/response";

type Operator = {
  operatorId: string;
  operatorName: string;
};

function isPublishedAnnouncement(item: any): boolean {
  if (!item) return false;

  if (item.status === "published") return true;
  if (item.isPublished === true) return true;
  if (item.published === true) return true;

  return false;
}

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

function assertCanViewAnnouncement(
  fastify: FastifyInstance,
  operatorId: string,
  announcement: { projectId?: string | null }
): void {
  if (fastify.services.projectMember.isAdmin(operatorId)) {
    return;
  }

  if (!announcement.projectId) {
    return;
  }

  const memberProjectIds = new Set(fastify.services.projectMember.listProjectIdsByUserId(operatorId));
  if (memberProjectIds.has(announcement.projectId)) {
    return;
  }

  throw new AppError("ANNOUNCEMENT_FORBIDDEN", "no permission to view announcement", 403);
}

function assertCanManageAnnouncement(
  fastify: FastifyInstance,
  operatorId: string,
  announcement: { projectId?: string | null },
  action: string
): void {
  if (!announcement.projectId) {
    if (fastify.services.projectMember.isAdmin(operatorId)) {
      return;
    }
    throw new AppError("ANNOUNCEMENT_ADMIN_REQUIRED", `${action} requires admin permission`, 403);
  }

  fastify.services.projectMember.assertCanManageProject(announcement.projectId, operatorId, action);
}

function emitAnnouncementUpdated(fastify: FastifyInstance, item: { id: string; title: string; projectId?: string | null }) {
  fastify.log.info(
    {
      event: "announcement.updated",
      id: item.id,
      title: item.title,
      projectId: item.projectId ?? null
    },
    "[hub-ws] emit announcement updated"
  );

  fastify.hubWsEvents.announcementUpdated({
    id: item.id,
    title: item.title,
    level: "info",
    projectId: item.projectId ?? null
  });
}

export default async function adminAnnouncementRoutes(fastify: FastifyInstance) {
  fastify.get("/announcements", async (request) => {
    const query = listAnnouncementQuerySchema.parse(request.query);
    const operator = getOperator(request);

    if (fastify.services.projectMember.isAdmin(operator.operatorId)) {
      const result = fastify.services.announcement.listWithReadState(operator.operatorId, {
        projectId: query.projectId,
        status: query.status,
        scope: query.scope,
        pinned: query.pinned,
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

    const result = fastify.services.announcement.listByProjectIdsWithReadState(
      operator.operatorId,
      memberProjectIds,
      {
        projectId: query.projectId,
        status: query.status,
        scope: query.scope,
        pinned: query.pinned,
        keyword: query.keyword,
        page: query.page,
        pageSize: query.pageSize
      },
      { includeGlobal: true }
    );

    return ok(result);
  });

  fastify.post("/announcements/read-all", async (request) => {
    const operator = getOperator(request);
    const count = fastify.services.projectMember.isAdmin(operator.operatorId)
      ? fastify.services.announcement.markAllPublishedRead(operator.operatorId)
      : fastify.services.announcement.markPublishedReadByProjectIds(
          operator.operatorId,
          fastify.services.projectMember.listProjectIdsByUserId(operator.operatorId),
          { includeGlobal: true }
        );

    return ok({ count }, "announcement read state updated");
  });

  fastify.get("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const operator = getOperator(request);
    const item = fastify.services.announcement.getByIdWithReadState(params.id, operator.operatorId);
    assertCanViewAnnouncement(fastify, operator.operatorId, item);
    return ok(item);
  });

  fastify.post("/announcements/:id/read", async (request) => {
    const params = request.params as { id: string };
    const operator = getOperator(request);
    const existing = fastify.services.announcement.getById(params.id);
    assertCanViewAnnouncement(fastify, operator.operatorId, existing);
    const item = fastify.services.announcement.markRead(params.id, operator.operatorId);
    return ok(item, "announcement marked as read");
  });

  fastify.post("/announcements", async (request, reply) => {
    const body = createAnnouncementSchema.parse(request.body);
    const operator = getOperator(request);
    const isAdmin = fastify.services.projectMember.isAdmin(operator.operatorId);

    if (!isAdmin && !body.projectId) {
      throw new AppError("ANNOUNCEMENT_PROJECT_REQUIRED", "projectId is required for non-admin announcement creation", 400);
    }

    if (body.projectId) {
      fastify.services.projectMember.assertCanManageProject(body.projectId, operator.operatorId, "create announcement");
    }

    const item = fastify.services.announcement.create({
      projectId: body.projectId ?? null,
      title: body.title,
      summary: body.summary,
      contentMd: body.contentMd,
      scope: body.scope,
      pinned: body.pinned,
      publishAt: body.publishAt,
      expireAt: body.expireAt,
      createdBy: operator.operatorId
    });

    return reply.status(201).send(ok(item, "announcement created"));
  });

  fastify.put("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateAnnouncementSchema.parse(request.body);
    const operator = getOperator(request);
    const existing = fastify.services.announcement.getById(params.id);
    const isAdmin = fastify.services.projectMember.isAdmin(operator.operatorId);

    assertCanManageAnnouncement(fastify, operator.operatorId, existing, "edit announcement");

    if (!isAdmin && body.projectId === null) {
      throw new AppError("ANNOUNCEMENT_PROJECT_REQUIRED", "projectId is required for non-admin announcement editing", 400);
    }

    if (body.projectId !== undefined && body.projectId !== null) {
      fastify.services.projectMember.assertCanManageProject(body.projectId, operator.operatorId, "edit announcement");
    }

    const item = fastify.services.announcement.update(params.id, {
      projectId: body.projectId,
      title: body.title,
      summary: body.summary,
      contentMd: body.contentMd,
      scope: body.scope,
      pinned: body.pinned,
      publishAt: body.publishAt,
      expireAt: body.expireAt
    });

    if (isPublishedAnnouncement(item)) {
      emitAnnouncementUpdated(fastify, item);
    }

    return ok(item, "announcement updated");
  });

  fastify.post("/announcements/:id/publish", async (request) => {
    const params = request.params as { id: string };
    const body = publishAnnouncementSchema.parse(request.body ?? {});
    const operator = getOperator(request);
    const existing = fastify.services.announcement.getById(params.id);

    assertCanManageAnnouncement(fastify, operator.operatorId, existing, "publish announcement");

    const item = fastify.services.announcement.publish(params.id, body);

    fastify.log.info(
      {
        event: "announcement.published",
        id: item.id,
        title: item.title,
        projectId: item.projectId ?? null
      },
      "[hub-ws] emit announcement published"
    );

    fastify.hubWsEvents.announcementPublished({
      id: item.id,
      title: item.title,
      level: "info",
      projectId: item.projectId ?? null
    });

    return ok(item, "announcement published");
  });

  fastify.post("/announcements/:id/archive", async (request) => {
    const params = request.params as { id: string };
    const operator = getOperator(request);
    const existing = fastify.services.announcement.getById(params.id);

    assertCanManageAnnouncement(fastify, operator.operatorId, existing, "archive announcement");

    const item = fastify.services.announcement.archive(params.id);

    if (existing.status === "published") {
      emitAnnouncementUpdated(fastify, item);
    }

    return ok(item, "announcement archived");
  });
}
