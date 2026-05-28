import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  addProjectModuleMemberSchema,
  addProjectMemberSchema,
  createProjectFeaturePointGroupSchema,
  createProjectFeaturePointSchema,
  createProjectConfigItemSchema,
  createProjectSchema,
  createProjectVersionItemSchema,
  deleteProjectFeatureProgressOverrideQuerySchema,
  listProjectsQuerySchema,
  replaceModuleRdLinksSchema,
  updateProjectFeaturePointSchema,
  updateProjectFeaturePointGroupSchema,
  updateProjectFeatureProgressSettingsSchema,
  updateProjectMemberSchema,
  updateProjectConfigItemSchema,
  upsertProjectFeatureProgressOverrideSchema,
  updateProjectSchema,
  updateProjectVersionItemSchema
} from "./project.schema";

export default async function projectRoutes(app: FastifyInstance) {
  app.get("/projects", async (request) => {
    const ctx = requireAuth(request);
    const query = listProjectsQuerySchema.parse(request.query);
    return ok(await app.container.projectQuery.listAccessible(query, ctx));
  });

  app.post("/projects", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createProjectSchema.parse(request.body);
    const project = await app.container.projectCommand.create(body, ctx);
    return reply.status(201).send(ok(project, "project created"));
  });

  app.get("/projects/:projectId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok(await app.container.projectQuery.getById(params.projectId, ctx));
  });

  app.patch("/projects/:projectId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = updateProjectSchema.parse(request.body);
    return ok(await app.container.projectCommand.update(params.projectId, body, ctx), "project updated");
  });

  app.get("/projects/:projectId/members", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok({ items: await app.container.projectQuery.listMembers(params.projectId, ctx) });
  });

  app.get("/projects/:projectId/member-candidates", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok({ items: await app.container.projectQuery.listMemberCandidates(params.projectId, ctx) });
  });

  app.post("/projects/:projectId/members", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = addProjectMemberSchema.parse(request.body);
    const member = await app.container.projectCommand.addMember(params.projectId, body, ctx);
    return reply.status(201).send(ok(member, "project member created"));
  });

  app.delete("/projects/:projectId/members/:memberId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; memberId: string };
    await app.container.projectCommand.removeMember(params.projectId, params.memberId, ctx);
    return ok({ id: params.memberId }, "project member removed");
  });

  app.patch("/projects/:projectId/members/:memberId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; memberId: string };
    const body = updateProjectMemberSchema.parse(request.body);
    const member = await app.container.projectCommand.updateMember(params.projectId, params.memberId, body, ctx);
    return ok(member, "project member updated");
  });

  app.get("/projects/:projectId/modules", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok({ items: await app.container.projectQuery.listModules(params.projectId, ctx) });
  });

  app.get("/projects/:projectId/modules/:moduleId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string };
    return ok(await app.container.projectQuery.getModule(params.projectId, params.moduleId, ctx));
  });

  app.post("/projects/:projectId/modules", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = createProjectConfigItemSchema.parse(request.body);
    const item = await app.container.projectCommand.addModule(params.projectId, body, ctx);
    return reply.status(201).send(ok(item, "project module created"));
  });

  app.patch("/projects/:projectId/modules/:moduleId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string };
    const body = updateProjectConfigItemSchema.parse(request.body);
    const item = await app.container.projectCommand.updateModule(params.projectId, params.moduleId, body, ctx);
    return ok(item, "project module updated");
  });

  app.delete("/projects/:projectId/modules/:moduleId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string };
    await app.container.projectCommand.removeModule(params.projectId, params.moduleId, ctx);
    return ok({ id: params.moduleId }, "project module deleted");
  });

  app.get("/projects/:projectId/feature-progress/settings", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok(await app.container.projectQuery.getFeatureProgressSettings(params.projectId, ctx));
  });

  app.put("/projects/:projectId/feature-progress/settings", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = updateProjectFeatureProgressSettingsSchema.parse(request.body);
    return ok(
      await app.container.projectCommand.updateFeatureProgressSettings(params.projectId, body, ctx),
      "project feature progress settings updated"
    );
  });

  app.get("/projects/:projectId/feature-progress", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok(await app.container.projectQuery.getFeatureProgress(params.projectId, ctx));
  });

  app.post("/projects/:projectId/feature-points", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = createProjectFeaturePointSchema.parse(request.body);
    const item = await app.container.projectCommand.addFeaturePoint(params.projectId, body, ctx);
    return reply.status(201).send(ok(item, "project feature point created"));
  });

  app.post("/projects/:projectId/feature-point-groups", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = createProjectFeaturePointGroupSchema.parse(request.body);
    const item = await app.container.projectCommand.addFeaturePointGroup(params.projectId, body, ctx);
    return reply.status(201).send(ok(item, "project feature point group created"));
  });

  app.patch("/projects/:projectId/feature-point-groups/:groupId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; groupId: string };
    const body = updateProjectFeaturePointGroupSchema.parse(request.body);
    return ok(
      await app.container.projectCommand.updateFeaturePointGroup(params.projectId, params.groupId, body, ctx),
      "project feature point group updated"
    );
  });

  app.delete("/projects/:projectId/feature-point-groups/:groupId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; groupId: string };
    return ok(
      await app.container.projectCommand.removeFeaturePointGroup(params.projectId, params.groupId, ctx),
      "project feature point group deleted"
    );
  });

  app.patch("/projects/:projectId/feature-points/:featurePointId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; featurePointId: string };
    const body = updateProjectFeaturePointSchema.parse(request.body);
    return ok(
      await app.container.projectCommand.updateFeaturePoint(params.projectId, params.featurePointId, body, ctx),
      "project feature point updated"
    );
  });

  app.delete("/projects/:projectId/feature-points/:featurePointId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; featurePointId: string };
    return ok(
      await app.container.projectCommand.removeFeaturePoint(params.projectId, params.featurePointId, ctx),
      "project feature point deleted"
    );
  });

  app.put("/projects/:projectId/feature-progress/overrides", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = upsertProjectFeatureProgressOverrideSchema.parse(request.body);
    return ok(
      await app.container.projectCommand.upsertFeatureProgressOverride(params.projectId, body, ctx),
      "project feature progress override updated"
    );
  });

  app.delete("/projects/:projectId/feature-progress/overrides", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const query = deleteProjectFeatureProgressOverrideQuerySchema.parse(request.query);
    return ok(
      await app.container.projectCommand.removeFeatureProgressOverride(params.projectId, query, ctx),
      "project feature progress override deleted"
    );
  });

  app.get("/projects/:projectId/modules/:moduleId/members", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string };
    return ok({ items: await app.container.projectQuery.listModuleMembers(params.projectId, params.moduleId, ctx) });
  });

  app.post("/projects/:projectId/modules/:moduleId/members", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string };
    const body = addProjectModuleMemberSchema.parse(request.body);
    const item = await app.container.projectCommand.addModuleMember(params.projectId, params.moduleId, body, ctx);
    return reply.status(201).send(ok(item, "project module member created"));
  });

  app.delete("/projects/:projectId/modules/:moduleId/members/:moduleMemberId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string; moduleMemberId: string };
    await app.container.projectCommand.removeModuleMember(
      params.projectId,
      params.moduleId,
      params.moduleMemberId,
      ctx
    );
    return ok({ id: params.moduleMemberId }, "project module member deleted");
  });

  app.get("/projects/:projectId/modules/:moduleId/rd-items", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string };
    return ok({ items: await app.container.projectQuery.listModuleRdLinks(params.projectId, params.moduleId, ctx) });
  });

  app.put("/projects/:projectId/modules/:moduleId/rd-items", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; moduleId: string };
    const body = replaceModuleRdLinksSchema.parse(request.body);
    const items = await app.container.projectCommand.replaceModuleRdLinks(params.projectId, params.moduleId, body, ctx);
    return ok({ items }, "project module rd links updated");
  });

  app.get("/projects/:projectId/module-rd-links", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok({ items: await app.container.projectQuery.listProjectModuleRdLinks(params.projectId, ctx) });
  });

  app.get("/projects/:projectId/environments", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok({ items: await app.container.projectQuery.listEnvironments(params.projectId, ctx) });
  });

  app.post("/projects/:projectId/environments", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = createProjectConfigItemSchema.parse(request.body);
    const item = await app.container.projectCommand.addEnvironment(params.projectId, body, ctx);
    return reply.status(201).send(ok(item, "project environment created"));
  });

  app.patch("/projects/:projectId/environments/:environmentId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; environmentId: string };
    const body = updateProjectConfigItemSchema.parse(request.body);
    const item = await app.container.projectCommand.updateEnvironment(
      params.projectId,
      params.environmentId,
      body,
      ctx
    );
    return ok(item, "project environment updated");
  });

  app.delete("/projects/:projectId/environments/:environmentId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; environmentId: string };
    await app.container.projectCommand.removeEnvironment(params.projectId, params.environmentId, ctx);
    return ok({ id: params.environmentId }, "project environment deleted");
  });

  app.get("/projects/:projectId/versions", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    return ok({ items: await app.container.projectQuery.listVersions(params.projectId, ctx) });
  });

  app.post("/projects/:projectId/versions", async (request, reply) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string };
    const body = createProjectVersionItemSchema.parse(request.body);
    const item = await app.container.projectCommand.addVersion(params.projectId, body, ctx);
    return reply.status(201).send(ok(item, "project version created"));
  });

  app.patch("/projects/:projectId/versions/:versionId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; versionId: string };
    const body = updateProjectVersionItemSchema.parse(request.body);
    const item = await app.container.projectCommand.updateVersion(params.projectId, params.versionId, body, ctx);
    return ok(item, "project version updated");
  });

  app.delete("/projects/:projectId/versions/:versionId", async (request) => {
    const ctx = requireAuth(request);
    const params = request.params as { projectId: string; versionId: string };
    await app.container.projectCommand.removeVersion(params.projectId, params.versionId, ctx);
    return ok({ id: params.versionId }, "project version deleted");
  });
}
