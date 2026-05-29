import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type { FastifyInstance } from "fastify";
import type {
  QuickSpriteProjectDto,
  QuickGenerateResponseDto,
  QuickImageItemDto,
  QuickImagesResponseDto,
  SpriteSnapshotDto,
  SpriteGroupItemDto,
  SpriteClassMetaDto,
  BrowseFilesDto,
  SpriteEntryDto,
} from "@yinuo-ngm/protocol";
import type { SpriteConfig } from "@yinuo-ngm/sprite";
import { buildLessForSprite } from "@yinuo-ngm/sprite";

/**
 * 远端雪碧图服务的基础 URL
 */
export const BASE_URL = (
  process.env.QUICK_SPRITE_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * 远端雪碧图 PNG 代理路由前缀
 * 前端通过此路由访问远端生成的雪碧图 PNG，后端实时从远端获取并流式返回（不落盘）
 */
export const QUICK_SPRITE_PROXY_PREFIX = "/api/sprite/proxy";

/**
 * 根据本地 projectId 和分组名构建远端雪碧图 PNG 预览 URL
 */
export function buildQuickPreviewUrl(
  localProjectId: string,
  group: string,
): string {
  return `${QUICK_SPRITE_PROXY_PREFIX}/${encodeURIComponent(localProjectId)}/${encodeURIComponent(group)}.png`;
}

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
  localProjectId: string,
  prefix: string,
  spriteUrlTemplate: string,
): SpriteGroupItemDto {
  const classes: SpriteClassMetaDto[] = (result.classes || []).map((c) => ({
    name: c.name,
    className: `${prefix}-${result.group.split("-")[0]}-${c.name}`,
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
  }));

  // 优先从 classes 数组推算雪碧图整体尺寸（比远端 width/height 更可靠，不依赖远端 spritesmith 元数据）
  const derived = deriveSpriteSize(classes);
  const spriteWidth = derived.width > 0 ? derived.width : result.width || 0;
  const spriteHeight = derived.height > 0 ? derived.height : result.height || 0;

  // 从 group 名解析 tile 尺寸：如 "10-10" → tileWidth=10, tileHeight=10
  const [tileW, tileH] = parseTileSize(result.group);

  // 使用本地配置的 prefix 和 spriteUrl 重新生成 lessText，而非透传远端 CSS
  const resolvedSpriteUrl = spriteUrlTemplate
    ? spriteUrlTemplate.replace(/{group}/g, result.group).replace(/{size}/g, String(tileW))
    : result.spriteUrl;
  const cssOpts = {
    prefix,
    spriteUrlResolver: ({ spriteUrl }: { spriteUrl: string }) => spriteUrl,
  };
  const lessText = buildLessForSprite(
    { group: result.group, spriteUrl: resolvedSpriteUrl, classes },
    cssOpts,
  );

  return {
    group: result.group,
    kind: "png",
    spriteUrl: resolvedSpriteUrl,
    previewSpriteUrl: buildQuickPreviewUrl(localProjectId, result.group),
    lessText,
    status: "ok",
    meta: {
      mode: result.mode,
      group: result.group,
      tileWidth: tileW,
      tileHeight: tileH,
      spriteWidth,
      spriteHeight,
      classes,
    },
  };
}

/**
 * 从 classes 数组推算雪碧图整体尺寸
 * spriteWidth = max(x + width)，spriteHeight = max(y + height)
 */
function deriveSpriteSize(
  classes: Array<{ x: number; y: number; width: number; height: number }>,
): { width: number; height: number } {
  if (!classes.length) return { width: 0, height: 0 };
  let maxW = 0;
  let maxH = 0;
  for (const c of classes) {
    const r = c.x + c.width;
    const b = c.y + c.height;
    if (r > maxW) maxW = r;
    if (b > maxH) maxH = b;
  }
  return { width: maxW, height: maxH };
}

/**
 * 从 group 名解析 tile 尺寸
 * 支持格式："10"（等宽高）、"10-10"、其他格式返回 0
 */
function parseTileSize(group: string): [number, number] {
  if (!group) return [0, 0];
  const parts = group.split("-");
  if (parts.length === 0) return [0, 0];
  if (parts.length === 1) {
    const n = parseInt(parts[0], 10);
    return Number.isFinite(n) ? [n, n] : [0, 0];
  }
  const w = parseInt(parts[0], 10);
  const h = parseInt(parts[1], 10);
  return [Number.isFinite(w) ? w : 0, Number.isFinite(h) ? h : 0];
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
  const spriteUrlTpl = localCfg?.spriteUrl ?? "";
  const groups: SpriteGroupItemDto[] = (results || []).map((r) =>
    mapToGroup(r, projectId, cssPrefix, spriteUrlTpl),
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
 * 将远端 fetch Response 的 headers（Content-Type, Content-Length, Cache-Control 等）
 * 复制到 Fastify reply，确保代理转发保留原始响应的元信息
 */
export function copyRawResponseHeaders(response: Response, reply: any): void {
  const contentType = response.headers.get("content-type");
  if (contentType) reply.header("content-type", contentType);

  const contentLength = response.headers.get("content-length");
  if (contentLength) reply.header("content-length", contentLength);

  const cacheControl = response.headers.get("cache-control");
  if (cacheControl) reply.header("cache-control", cacheControl);

  const etag = response.headers.get("etag");
  if (etag) reply.header("etag", etag);

  const lastModified = response.headers.get("last-modified");
  if (lastModified) reply.header("last-modified", lastModified);
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

// ========== 远端切图浏览 ==========

/** 切图列表缓存：key = quickProjectId，value = { time, data } */
const miscCache = new Map<
  string,
  { time: number; data: QuickImagesResponseDto }
>();

/** 切图列表缓存 TTL（毫秒），默认 5 分钟 */
const MISC_CACHE_TTL = 5 * 60 * 1000;

/**
 * 从远端获取切图列表并缓存
 */
export async function fetchAndCacheRemoteMiscImages(
  fastify: FastifyInstance,
  quickProjectId: string,
  forceRefresh = false,
): Promise<QuickImagesResponseDto> {
  const cached = miscCache.get(quickProjectId);
  if (!forceRefresh && cached && Date.now() - cached.time < MISC_CACHE_TTL) {
    return cached.data;
  }
  const data = await quickFetch<QuickImagesResponseDto>(
    fastify,
    `/api/misc/list?projectId=${encodeURIComponent(quickProjectId)}`,
  );
  miscCache.set(quickProjectId, { time: Date.now(), data });
  return data;
}

/**
 * 将缓存的远端切图列表转换为 BrowseFilesDto（按目录分组）
 * 返回结果按字母顺序排序，目录排在文件前面
 */
export function buildBrowseFromCache(
  quickProjectId: string,
  cache: QuickImagesResponseDto,
  dir?: string,
): BrowseFilesDto {
  const list = cache.list || [];
  // 当前快捷雪碧图目录（根目录对应 "."）
  const quickDir = dir ? `${dir}` : ".";

  // 过滤指定目录下的文件
  const filtered = list.filter(
    (item: QuickImageItemDto) => item.dir === quickDir,
  );

  // 按字母顺序排序
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true }));

  const fileEntries: SpriteEntryDto[] = sorted.map((item: QuickImageItemDto) => {
    const encodedName = encodeURIComponent(item.name);
    return {
      name: item.name,
      kind: "file" as const,
      ext: item.name.split(".").pop()?.toLowerCase(),
      url: `/api/sprite/misc-proxy/${encodeURIComponent(quickProjectId)}/${encodeURIComponent(item.dir)}/${encodedName}`,
    };
  });

  // 收集所有目录
  const dirSet = new Set<string>();
  for (const item of list) {
    if (item.dir) dirSet.add(item.dir);
  }

  // 当前目录下的子目录
  const subDirSet = new Set<string>();
  for (const d of dirSet) {
    if (d === quickDir) continue;
    if (d.startsWith(quickDir) || quickDir === ".") {
      const dirName =
        quickDir === "."
          ? d.split("/")[0]
          : d.slice(quickDir.length).split("/")[1];
      subDirSet.add(dirName);
    }
  }

  // 目录项按字母顺序排序
  const dirEntries: SpriteEntryDto[] = Array.from(subDirSet)
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true }))
    .map((d) => ({
      name: d,
      kind: "dir" as const,
      ext: undefined,
      fileCount: list.filter(
        (item: QuickImageItemDto) =>
          item.dir === `${quickDir === "." ? "" : quickDir + "/"}${d}`,
      ).length,
    }));

  // 目录在前，文件在后
  const entries: SpriteEntryDto[] = [...dirEntries, ...fileEntries];

  return {
    root: `remote:${quickProjectId}`,
    dir,
    entries,
  };
}

/** 远端切图图片代理路由前缀 */
export const MISC_PROXY_PREFIX = "/api/sprite/misc-proxy";

/**
 * 构建远端切图原始 URL
 */
export function buildRemoteMiscUrl(
  quickProjectId: string,
  filename: string,
): string {
  return `${BASE_URL}/misc/${encodeURIComponent(quickProjectId)}/misc/${encodeURIComponent(filename)}`;
}
