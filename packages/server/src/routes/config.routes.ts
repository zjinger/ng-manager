import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import { resolveProjectFile, type ConfigPatch } from "@yinuo-ngm/config";
import type { FastifyInstance } from "fastify";
import { openFolder } from "../common/editor";

interface WriteConfigBody {
  type?: string;
  filePath?: string;
  patches?: ConfigPatch[];
}

const PATCH_OPS = new Set<ConfigPatch["op"]>(["set", "remove", "append", "merge"]);

function isPatchValid(patch: unknown): patch is ConfigPatch {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return false;
  }

  const candidate = patch as { op?: unknown; path?: unknown; value?: unknown };
  if (typeof candidate.op !== "string" || !PATCH_OPS.has(candidate.op as ConfigPatch["op"])) {
    return false;
  }
  if (typeof candidate.path !== "string" || candidate.path.length === 0) {
    return false;
  }
  if (
    (candidate.op === "set" || candidate.op === "append" || candidate.op === "merge") &&
    (candidate.value === undefined || candidate.value === null)
  ) {
    return false;
  }
  return true;
}

function ensureWriteBody(body: WriteConfigBody): {
  type: string;
  filePath: string;
  patches: ConfigPatch[];
} {
  if (!body.type || !body.filePath || !Array.isArray(body.patches)) {
    throw new GlobalError(
      GlobalErrorCodes.BAD_REQUEST,
      "missing body.type/body.filePath/body.patches"
    );
  }
  if (!body.patches.every(isPatchValid)) {
    throw new GlobalError(
      GlobalErrorCodes.BAD_REQUEST,
      "invalid body.patches[] (require op/path/value)"
    );
  }

  return {
    type: body.type,
    filePath: body.filePath,
    patches: body.patches
  };
}

export default async function configRoutes(fastify: FastifyInstance) {
  const config = fastify.core.config;

  fastify.get("/providers", async () => {
    return config.listProviders();
  });

  fastify.get<{ Params: { projectId: string } }>("/detect/:projectId", async (req) => {
    const project = await fastify.core.project.get(req.params.projectId);
    return config.detect(project.root);
  });

  fastify.get<{
    Params: { projectId: string; type: string };
    Querystring: { filePath?: string };
  }>("/doc/:projectId/:type", async (req) => {
    const project = await fastify.core.project.get(req.params.projectId);
    return config.read({
      projectRoot: project.root,
      type: req.params.type,
      filePath: req.query.filePath
    });
  });

  fastify.post<{ Params: { projectId: string }; Body: WriteConfigBody }>(
    "/preview/:projectId",
    async (req) => {
      const body = ensureWriteBody(req.body ?? {});
      const project = await fastify.core.project.get(req.params.projectId);
      return config.preview({
        projectRoot: project.root,
        type: body.type,
        filePath: body.filePath,
        patches: body.patches
      });
    }
  );

  fastify.post<{ Params: { projectId: string }; Body: WriteConfigBody }>(
    "/write/:projectId",
    async (req) => {
      const body = ensureWriteBody(req.body ?? {});
      const project = await fastify.core.project.get(req.params.projectId);
      return config.write({
        projectRoot: project.root,
        type: body.type,
        filePath: body.filePath,
        patches: body.patches
      });
    }
  );

  fastify.post<{
    Params: { projectId: string };
    Body: { filePath?: string };
  }>("/openInEditor/:projectId", async (req) => {
    if (!req.body?.filePath) {
      throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, "missing body.filePath");
    }
    const project = await fastify.core.project.get(req.params.projectId);
    const absPath = resolveProjectFile(project.root, req.body.filePath);
    await openFolder(absPath, { editor: "code" });
    return {
      filePath: absPath
    };
  });
}
