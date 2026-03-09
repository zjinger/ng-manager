import type { FastifyInstance } from "fastify";
import {
  createAnnouncementSchema,
  listAnnouncementQuerySchema,
  publishAnnouncementSchema,
  updateAnnouncementSchema
} from "../../modules/announcement/announcement.schema";
import { ok } from "../../utils/response";

function isPublishedAnnouncement(item: any): boolean {
  if (!item) return false;

  if (item.status === "published") return true;
  if (item.isPublished === true) return true;
  if (item.published === true) return true;

  return false;
}

export default async function adminAnnouncementRoutes(fastify: FastifyInstance) {
  fastify.get("/announcements", async (request) => {
    const query = listAnnouncementQuerySchema.parse(request.query);
    const result = fastify.services.announcement.list({
      projectId: query.projectId,
      status: query.status,
      scope: query.scope,
      pinned: query.pinned,
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize
    });
    return ok(result);
  });

  fastify.get("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const item = fastify.services.announcement.getById(params.id);
    return ok(item);
  });

  fastify.post("/announcements", async (request, reply) => {
    const body = createAnnouncementSchema.parse(request.body);
    const item = fastify.services.announcement.create({
      projectId: body.projectId ?? null,
      title: body.title,
      summary: body.summary,
      contentMd: body.contentMd,
      scope: body.scope,
      pinned: body.pinned,
      publishAt: body.publishAt,
      expireAt: body.expireAt,
      createdBy: body.createdBy
    });

    return reply.status(201).send(ok(item, "announcement created"));
  });

  fastify.put("/announcements/:id", async (request) => {
    const params = request.params as { id: string };
    const body = updateAnnouncementSchema.parse(request.body);
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

    return ok(item, "announcement updated");
  });

  fastify.post("/announcements/:id/publish", async (request) => {
    const params = request.params as { id: string };
    const body = publishAnnouncementSchema.parse(request.body ?? {});
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
    const item = fastify.services.announcement.archive(params.id);
    return ok(item, "announcement archived");
  });
}