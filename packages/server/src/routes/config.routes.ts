import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import { resolveProjectFile } from "@yinuo-ngm/config";
import type {
  ConfigOpenInEditorRequestDto,
  ConfigPatchDto,
  ConfigPreviewRequestDto,
  ConfigWriteRequestDto
} from "@yinuo-ngm/protocol";
import type { FastifyInstance } from "fastify";
import { openFolder } from "../common/editor";

type WriteConfigBody = Partial<ConfigWriteRequestDto>;

const PATCH_OPS = new Set<ConfigPatchDto["op"]>(["set", "remove", "append", "merge"]);

function isPatchValid(patch: unknown): patch is ConfigPatchDto {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return false;
  }

  const candidate = patch as { op?: unknown; path?: unknown; value?: unknown };
  if (typeof candidate.op !== "string" || !PATCH_OPS.has(candidate.op as ConfigPatchDto["op"])) {
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
  patches: ConfigPatchDto[];
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

  fastify.post<{ Params: { projectId: string }; Body: ConfigPreviewRequestDto }>(
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

  fastify.post<{ Params: { projectId: string }; Body: ConfigWriteRequestDto }>(
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
    Body: Partial<ConfigOpenInEditorRequestDto>;
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
