import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";
import type {
  QuickSpriteProjectDto,
  QuickGenerateResponseDto,
  SpriteSnapshotDto,
  SpriteGroupItemDto,
} from "@yinuo-ngm/protocol";
import type { SpriteConfig } from "@yinuo-ngm/sprite";

/**
 * 远端雪碧图服务的基础 URL
 */
const BASE_URL = (
  process.env.QUICK_SPRITE_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * 通用 fetch 封装：向远端服务发起请求
 */
export async function quickFetch<T>(
  fastify: FastifyInstance,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  fastify.log.info(`[sprite-quick] → ${init?.method || "GET"} ${url}`);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (err: any) {
    fastify.log.error(
      `[sprite-quick] ✗ 无法连接远端 ${url}: ${err?.message || err}`,
    );
    throw new GlobalError(
      GlobalErrorCodes.INTERNAL_ERROR,
      `无法连接远端雪碧图服务 (${BASE_URL})：${err?.message || err}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    fastify.log.error(`[sprite-quick] ← ${res.status} ${url}: ${text}`);
    throw new GlobalError(
      GlobalErrorCodes.INTERNAL_ERROR,
      `远端服务返回 ${res.status}: ${text || res.statusText}`,
    );
  }

  const data = (await res.json()) as T;
  fastify.log.info(`[sprite-quick] ← ${res.status} ${url}`);
  return data;
}

/**
 * 通过本地 projectId 解析远端项目 ID
 *
 * 映射链路：本地 projectId → SpriteConfig.quickSpriteProjectId → 远端项目 ID
 * 返回 null 表示未配置 quickSpriteProjectId（应走本地逻辑）
 */
export async function resolveEnabledRemoteProjectId(
  fastify: FastifyInstance,
  projectId: string,
): Promise<string | null> {
  const cfg = await fastify.core.sprite.getConfig(projectId);
  if (!cfg?.quickSpriteEnabled || !cfg?.quickSpriteProjectId) return null;
  return cfg.quickSpriteProjectId;
}

/**
 * 从远端获取单个项目的配置信息（使用 GET /api/projects/:id）
 */
export async function fetchRemoteProject(
  fastify: FastifyInstance,
  quickProjectId: string,
): Promise<QuickSpriteProjectDto | null> {
  try {
    return await quickFetch<QuickSpriteProjectDto>(
      fastify,
      `/api/projects/${encodeURIComponent(quickProjectId)}`,
    );
  } catch {
    return null;
  }
}

/**
 * 将单个远端生成响应映射为 SpriteGroupItemDto
 */
export function mapToGroup(
  result: QuickGenerateResponseDto,
  prefix: string,
): SpriteGroupItemDto {
  return {
    group: result.group,
    kind: "png",
    spriteUrl: result.spriteUrl,
    lessText: result.cssText,
    status: "ok",
    meta: {
      mode: result.mode,
      group: result.group,
      tileWidth: 0,
      tileHeight: 0,
      spriteWidth: result.width,
      spriteHeight: result.height,
      classes: (result.classes || []).map((c) => ({
        name: c.name,
        className: `${prefix}-${result.group}-${c.name}`,
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
      })),
    },
  };
}

/**
 * 将远端已生成分组列表映射为本地的 SpriteSnapshotDto
 *
 * @param projectId   本地项目 ID
 * @param results     远端返回的已生成分组列表
 * @param remoteProj  远端项目配置（提供 iconsRoot、cacheOutDir、updatedAt）
 * @param localCfg    本地 SpriteConfig（提供 prefix、template、spriteUrl 等）
 */
export function mapQuickGroupsToSnapshot(
  projectId: string,
  results: QuickGenerateResponseDto[],
  remoteProj: QuickSpriteProjectDto | null,
  localCfg: SpriteConfig | null,
): SpriteSnapshotDto {
  const cssPrefix = localCfg?.prefix ?? "sl";
  const groups: SpriteGroupItemDto[] = (results || []).map((r) =>
    mapToGroup(r, cssPrefix),
  );

  return {
    projectId,
    sourceId: "",
    // 来自远端项目配置
    iconsRoot: remoteProj?.iconsPath ?? "",
    cacheOutDir: remoteProj?.exportSpritesDir ?? "",
    config: {
      projectId,
      enabled: true,
      sourceId: "",
      // 远端获取不需要导出本地文件夹
      localDir: "",
      prefix: cssPrefix,
      algorithm: "binary-tree",
      persistLess: false,
      updatedAt: remoteProj?.updatedAt
        ? new Date(remoteProj.updatedAt).getTime()
        : Date.now(),
      // 来自本地 SpriteConfig
      template: localCfg?.template ?? '<i class="{base} {class}"></i>',
      spriteUrl: localCfg?.spriteUrl ?? "",
      spriteExportDir: localCfg?.spriteExportDir ?? "",
      lessExportDir: localCfg?.lessExportDir ?? "",
      localImageRoot: localCfg?.localImageRoot ?? "",
      localCacheDir: localCfg?.localCacheDir ?? "",
    },
    total: groups.length,
    success: groups.length,
    failed: 0,
    groups,
  };
}

/**
 * 判断本地项目是否配置了快捷雪碧图映射
 */
export async function hasQuickSprite(
  fastify: FastifyInstance,
  projectId: string,
): Promise<boolean> {
  const cfg = await fastify.core.sprite.getConfig(projectId);
  return !!cfg?.quickSpriteProjectId;
}