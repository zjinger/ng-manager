/**
 * 生成 Hub-v2 API 的 Postman Collection 数据，输出到指定目录或直接应用到数据目录
 * 
 * 使用方式：
 * 1. 直接生成到指定目录：
 *    node generate-hub-v2-api-data.js --outDir ./hub-v2-api-data
 * 
 * 2. 生成并应用到数据目录（覆盖现有同名数据）：
 *   node generate-hub-v2-api-data.js --apply
 * 
 * 可选参数：
 * --dataDir <path>   指定数据目录，默认为 ~/.ng-manager
 * --baseUrl <url>    指定环境变量中的 baseUrl，默认为 http://127.0.0.1:7008
 * 
 */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const DEFAULT_NAME_MAP_PATH = path.join(__dirname, "generate-hub-v2-api-name-map.json");

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function readJsonIfExists(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function normalizePathToUrl(p) {
  const normalized = p.replace(/\\/g, "/").replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function safeRead(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function readKvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { version: 1, items: {} };
  }
  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (content?.version !== 1 || typeof content.items !== "object" || !content.items) {
      return { version: 1, items: {} };
    }
    return content;
  } catch {
    return { version: 1, items: {} };
  }
}

function parseRegisterImportsAndPrefixes(registerRoutesPath) {
  const content = safeRead(registerRoutesPath);
  const imports = new Map();
  const prefixes = [];

  const importRegex = /import\s+(\w+)\s+from\s+"([^"]+)";/g;
  let importMatch = null;
  while ((importMatch = importRegex.exec(content))) {
    const [, symbol, rel] = importMatch;
    imports.set(symbol, rel);
  }

  const registerRegex = /app\.register\((\w+),\s*\{\s*prefix:\s*["'`]([^"'`]+)["'`]\s*\}\s*\);/g;
  let registerMatch = null;
  while ((registerMatch = registerRegex.exec(content))) {
    const [, symbol, prefix] = registerMatch;
    prefixes.push({ symbol, prefix });
  }

  return { imports, prefixes };
}

const schemaKeysCache = new Map();

function parseImportedSchemaMap(routeContent, routeFilePath) {
  const map = new Map();
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+["'`]([^"'`]+)["'`];/g;
  let match = null;
  while ((match = importRegex.exec(routeContent))) {
    const names = match[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const importPath = match[2];
    if (!importPath.endsWith(".schema")) {
      continue;
    }
    const schemaFilePath = path.resolve(path.dirname(routeFilePath), `${importPath}.ts`);
    for (const name of names) {
      map.set(name, schemaFilePath);
    }
  }
  return map;
}

function extractSchemaObjectKeys(schemaFilePath, schemaName) {
  const cacheKey = `${schemaFilePath}::${schemaName}`;
  if (schemaKeysCache.has(cacheKey)) {
    return schemaKeysCache.get(cacheKey);
  }
  if (!fs.existsSync(schemaFilePath)) {
    schemaKeysCache.set(cacheKey, []);
    return [];
  }

  const content = safeRead(schemaFilePath);
  const schemaRegex = new RegExp(`${schemaName}\\s*=\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\)`, "m");
  const match = content.match(schemaRegex);
  if (!match) {
    schemaKeysCache.set(cacheKey, []);
    return [];
  }

  const body = match[1];
  const keys = Array.from(body.matchAll(/([a-zA-Z_]\w*)\s*:/g)).map((m) => m[1]);
  const uniq = Array.from(new Set(keys));
  schemaKeysCache.set(cacheKey, uniq);
  return uniq;
}

function parseRoutesFromFile(routeFilePath) {
  const content = safeRead(routeFilePath);
  const schemaImports = parseImportedSchemaMap(content, routeFilePath);
  const routes = [];
  const routeRegex = /\bapp\.(get|post|put|patch|delete|head|options)\(\s*["'`]([^"'`]+)["'`]/gi;

  const starts = [];
  let match = null;
  while ((match = routeRegex.exec(content))) {
    starts.push({
      method: match[1].toUpperCase(),
      routePath: match[2],
      start: match.index,
      bodyStart: routeRegex.lastIndex
    });
  }

  for (let i = 0; i < starts.length; i += 1) {
    const current = starts[i];
    const next = starts[i + 1];
    const bodyEnd = next ? next.start : content.length;
    const snippet = content.slice(current.bodyStart, bodyEnd);

    const queryKeysFromFieldUsage = Array.from(snippet.matchAll(/\bquery\.([a-zA-Z_]\w*)/g)).map((m) => m[1]);
    const querySchemaNames = Array.from(snippet.matchAll(/([a-zA-Z_]\w*)\.parse\(\s*request\.query\s*\)/g)).map((m) => m[1]);
    const queryKeysFromSchema = querySchemaNames.flatMap((schemaName) => {
      const schemaFilePath = schemaImports.get(schemaName);
      if (!schemaFilePath) {
        return [];
      }
      return extractSchemaObjectKeys(schemaFilePath, schemaName);
    });

    const queryKeys = [...queryKeysFromFieldUsage, ...queryKeysFromSchema];
    const pathKeysFromBody = Array.from(snippet.matchAll(/\bparams\.([a-zA-Z_]\w*)/g)).map((m) => m[1]);
    const pathKeysFromPath = Array.from(current.routePath.matchAll(/:([a-zA-Z_]\w*)/g)).map((m) => m[1]);

    routes.push({
      method: current.method,
      routePath: current.routePath,
      queryKeys: Array.from(new Set(queryKeys)),
      pathKeys: Array.from(new Set([...pathKeysFromPath, ...pathKeysFromBody]))
    });
  }
  return routes;
}

function buildEndpoints(hubV2ServerSrc) {
  const registerRoutesPath = path.join(hubV2ServerSrc, "app", "register-routes.ts");
  const { imports, prefixes } = parseRegisterImportsAndPrefixes(registerRoutesPath);
  const endpoints = [];

  for (const { symbol, prefix } of prefixes) {
    const importPath = imports.get(symbol);
    if (!importPath) continue;
    const routeFilePath = path.resolve(path.dirname(registerRoutesPath), `${importPath}.ts`);
    if (!fs.existsSync(routeFilePath)) continue;

    const routes = parseRoutesFromFile(routeFilePath);
    for (const route of routes) {
      endpoints.push({
        symbol,
        method: route.method,
        routePath: route.routePath,
        queryKeys: route.queryKeys,
        pathKeys: route.pathKeys,
        fullPath: normalizePathToUrl(`${prefix}/${route.routePath}`),
        sourceFile: routeFilePath
      });
    }
  }

  const uniq = new Map();
  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.fullPath}`;
    if (!uniq.has(key)) uniq.set(key, endpoint);
  }
  return Array.from(uniq.values()).sort((a, b) =>
    a.fullPath === b.fullPath ? a.method.localeCompare(b.method) : a.fullPath.localeCompare(b.fullPath)
  );
}

function endpointName(endpoint) {
  return `${endpoint.method} ${endpoint.fullPath}`;
}

function resourceNameCn(endpoint) {
  const pathWithoutPrefix = endpoint.fullPath
    .replace(/^\/api\/admin\//, "")
    .replace(/^\/api\/public\//, "");
  const first = pathWithoutPrefix.split("/")[0] || "";
  const map = {
    auth: "认证",
    dashboard: "仪表盘",
    issues: "问题",
    "issue-comments": "问题评论",
    "issue-participants": "问题协作人",
    "issue-attachments": "问题附件",
    rd: "研发项",
    projects: "项目",
    users: "用户",
    profile: "个人中心",
    notifications: "通知",
    feedbacks: "反馈",
    uploads: "上传",
    announcements: "公告",
    documents: "文档",
    releases: "发布",
    "shared-configs": "共享配置",
    health: "健康检查"
  };
  return map[first] || "接口";
}

function actionNameCn(endpoint) {
  const path = endpoint.fullPath;
  const hasPathParam = /\/:[^/]+/.test(path);
  const suffix = path.split("/").filter(Boolean).at(-1) || "";
  const explicit = {
    challenge: "获取登录挑战",
    login: "登录",
    logout: "退出登录",
    me: "获取当前信息",
    "change-password": "修改密码",
    avatar: endpoint.method === "PATCH" ? "更新头像" : "获取头像",
    publish: "发布",
    status: "更新状态",
    "mark-read": "标记已读",
    "mark-all-read": "全部已读",
    claim: "认领",
    assign: "指派",
    transition: "状态流转",
    latest: "获取最新"
  };

  if (explicit[suffix]) {
    return explicit[suffix];
  }
  if (endpoint.method === "GET") {
    return hasPathParam ? "获取详情" : "获取列表";
  }
  if (endpoint.method === "POST") {
    return hasPathParam ? "执行操作" : "创建";
  }
  if (endpoint.method === "PUT" || endpoint.method === "PATCH") {
    return "更新";
  }
  if (endpoint.method === "DELETE") {
    return "删除";
  }
  return "调用";
}

function endpointNameCn(endpoint) {
  return `${resourceNameCn(endpoint)}-${actionNameCn(endpoint)}`;
}

function resolveEndpointName(endpoint, nameMap) {
  const exactKey = `${endpoint.method} ${endpoint.fullPath}`;
  const exact = nameMap?.exact || {};
  const byPath = nameMap?.path || {};
  if (typeof exact[exactKey] === "string" && exact[exactKey].trim()) {
    return exact[exactKey].trim();
  }
  if (typeof byPath[endpoint.fullPath] === "string" && byPath[endpoint.fullPath].trim()) {
    return byPath[endpoint.fullPath].trim();
  }
  return endpointNameCn(endpoint);
}

function groupName(endpoint) {
  const p = endpoint.fullPath;
  if (p.startsWith("/api/admin/auth")) return "认证";
  if (p.startsWith("/api/admin/dashboard")) return "仪表盘";
  if (p.startsWith("/api/admin/issues")) return "测试管理";
  if (p.startsWith("/api/admin/issue-comments")) return "测试管理";
  if (p.startsWith("/api/admin/issue-participants")) return "测试管理";
  if (p.startsWith("/api/admin/issue-attachments")) return "测试管理";
  if (p.startsWith("/api/admin/rd")) return "研发管理";
  if (p.startsWith("/api/admin/projects")) return "项目管理";
  if (p.startsWith("/api/admin/users")) return "用户管理";
  if (p.startsWith("/api/admin/profile")) return "个人中心";
  if (p.startsWith("/api/admin/notifications")) return "通知中心";
  if (p.startsWith("/api/admin/feedbacks")) return "反馈";
  if (p.startsWith("/api/admin/uploads")) return "上传";
  if (p.startsWith("/api/admin/announcements")) return "内容中心";
  if (p.startsWith("/api/admin/documents")) return "内容中心";
  if (p.startsWith("/api/admin/releases")) return "内容中心";
  if (p.startsWith("/api/admin/shared-configs")) return "内容中心";
  if (p.startsWith("/api/public")) return "公开接口";
  return "其他";
}

function buildRequest(endpoint, index, now, collectionId, nameMap) {
  const id = `req_hubv2_${String(index + 1).padStart(3, "0")}_${now.toString(36)}`;
  const isWrite = ["POST", "PUT", "PATCH"].includes(endpoint.method);
  const isNoAuth = endpoint.fullPath.startsWith("/api/admin/auth/login") || endpoint.fullPath.startsWith("/api/public/");
  const pathParams = (endpoint.pathKeys || []).map((key) => ({
    key,
    value: `{{${key}}}`,
    enabled: true
  }));
  const query = (endpoint.queryKeys || []).map((key) => ({
    key,
    value: "",
    enabled: false
  }));
  return {
    id,
    name: resolveEndpointName(endpoint, nameMap),
    method: endpoint.method,
    url: endpoint.fullPath,
    collectionId,
    query,
    pathParams,
    headers: isWrite ? [{ key: "Content-Type", value: "application/json; charset=utf-8", enabled: true }] : [],
    body: isWrite
      ? { mode: "json", contentType: "application/json; charset=utf-8", content: {} }
      : { mode: "none" },
    auth: {
      type: isNoAuth ? "none" : "cookie"
    },
    options: {
      followRedirects: true,
      timeoutMs: 30000
    },
    tags: [],
    createdAt: now,
    updatedAt: now
  };
}

function toKvMap(items) {
  const map = {};
  for (const item of items) map[item.id] = item;
  return { version: 1, items: map };
}

function mergeAndWriteKv(filePath, appendItems) {
  const existing = readKvFile(filePath);
  for (const item of appendItems) existing.items[item.id] = item;
  writeJson(filePath, existing);
}

function main() {
  const hubV2Root = path.resolve(__dirname, "..");
  const hubV2ServerSrc = path.join(hubV2Root,  "server", "src");

  const outDirArg = parseArg("outDir");
  const outDir = path.resolve(outDirArg ?? path.join(hubV2Root, ".generated", "hub-v2-api"));
  const apply = hasFlag("apply");
  const targetDataDir = path.resolve(
    parseArg("dataDir") ?? process.env.NGM_DATA_DIR ?? path.join(os.homedir(), ".ng-manager")
  );
  const baseUrl = parseArg("baseUrl") ?? "http://127.0.0.1:7008";
  const nameMapPath = path.resolve(parseArg("nameMap") ?? DEFAULT_NAME_MAP_PATH);
  const nameMap = readJsonIfExists(nameMapPath, { exact: {}, path: {} });
  const projectId = parseArg("projectId");
  const scope = projectId ? "project" : "global";

  const endpoints = buildEndpoints(hubV2ServerSrc);
  const now = Date.now();

  const grouped = new Map();
  for (const endpoint of endpoints) {
    const group = groupName(endpoint);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(endpoint);
  }

  const collections = [];
  const requests = [];
  let reqIdx = 0;
  let colIdx = 0;

  for (const [name, list] of Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    colIdx += 1;
    const colId = `col_hubv2_${String(colIdx).padStart(2, "0")}_${now.toString(36)}`;

    collections.push({
      id: colId,
      name,
      kind: "collection",
      scope,
      ...(projectId ? { projectId } : {}),
      nodes: [],
      parentId: null,
      order: now + colIdx,
      createdAt: now,
      updatedAt: now
    });

    for (const endpoint of list) {
      requests.push(buildRequest(endpoint, reqIdx, now, colId, nameMap));
      reqIdx += 1;
    }
  }

  const envEntity = {
    id: `env_hubv2_${now.toString(36)}`,
    scope,
    name: "Hub-v2",
    ...(projectId ? { projectId } : {}),
    variables: [],
    createdAt: now,
    updatedAt: now,
    baseUrl
  };

  const bundle = {
    generatedAt: new Date(now).toISOString(),
    source: hubV2ServerSrc,
    summary: {
      routeCount: endpoints.length,
      adminRouteCount: endpoints.filter((item) => item.fullPath.startsWith("/api/admin/")).length,
      publicRouteCount: endpoints.filter((item) => item.fullPath.startsWith("/api/public/")).length
    },
    scope,
    projectId: projectId ?? null,
    collections,
    requests,
    envs: [envEntity]
  };

  const outScopeDir = scope === "project"
    ? path.join(outDir, "projects", projectId)
    : path.join(outDir, "global");
  writeJson(path.join(outDir, "bundle.json"), bundle);
  writeJson(path.join(outScopeDir, "collections.kv.json"), toKvMap(collections));
  writeJson(path.join(outScopeDir, "requests.kv.json"), toKvMap(requests));
  writeJson(path.join(outScopeDir, "envs.kv.json"), toKvMap([envEntity]));

  if (apply) {
    const apiScopeDir = scope === "project"
      ? path.join(targetDataDir, "api", "projects", projectId)
      : path.join(targetDataDir, "api", "global");
    fs.mkdirSync(apiScopeDir, { recursive: true });
    mergeAndWriteKv(path.join(apiScopeDir, "collections.kv.json"), collections);
    mergeAndWriteKv(path.join(apiScopeDir, "requests.kv.json"), requests);
    mergeAndWriteKv(path.join(apiScopeDir, "envs.kv.json"), [envEntity]);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        outDir,
        apply,
        scope,
        projectId: projectId ?? null,
        nameMapPath: fs.existsSync(nameMapPath) ? nameMapPath : null,
        targetDataDir: apply ? targetDataDir : null,
        generated: {
          collections: collections.length,
          requests: requests.length,
          envs: 1
        }
      },
      null,
      2
    )
  );
}

main();
