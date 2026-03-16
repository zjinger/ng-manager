/**
 *  copy.js
 * 负责将构建产物和必要的配置文件从源目录复制到 build 目录，为后续的打包发布做准备
 * 主要步骤：
 *  1. 清理 build 目录，确保干净的构建环境
 *  2. 将 server/dist 下的所有文件复制到 build 根目录
 *  3. 将 web/dist 下的所有文件复制到 build/www 目录
 *  4. 将 server/package.json 中的必要字段（如 dependencies, scripts）提取出来，生成新的 package.json 到 build 目录
 *  5. 将 server/package-lock.json（如果存在）复制到 build 目录
 *  6. 将 server/.env.production（如果存在）复制到 build 目录
 *  7. 将根目录下的 ecosystem.config.cjs 复制到 build 目录
 * 注意：
 *  - 该脚本假设 server 和 web 的构建产物分别位于 server/dist 和 web/dist
 *  - 生成的 build 目录结构如下：
 *  build/
 *   ├── ...               # 来自 server/dist 的文件
 *   ├── www/                 # 来自 web/dist 的文件
 *   ├── package.json          # 生成的生产环境 package.json
 *   ├── package-lock.json     # 来自 server/package-lock.json（如果存在）
 *   ├── .env.production       # 来自 server/.env.production（如果存在）
 *   └── ecosystem.config.cjs   # 来自根目录的 ecosystem.config.cjs
 * 该脚本的目的是为后续的打包和部署步骤准备好一个干净且包含必要文件的 build 目录，确保生产环境部署时只包含必要的文件和配置，避免不必要的开发依赖和文件被部署到生产环境中。
 *
 */
const fs = require("node:fs");
const path = require("node:path");

const HUB_ROOT = path.resolve(__dirname, "..");

const WEB_DIST = path.join(HUB_ROOT, "web", "dist", "hub-web");
const SERVER_DIST = path.join(HUB_ROOT, "server", "dist");

const SERVER_PACKAGE_JSON = path.join(HUB_ROOT, "server", "package.json");
const SERVER_PACKAGE_LOCK = path.join(HUB_ROOT, "server", "package-lock.json");
const SERVER_ENV_PROD = path.join(HUB_ROOT, "server", ".env.production");
const SERVER_DB_MIGRATIONS = path.join(HUB_ROOT, "server", "src", "db", "migrations");


const HUB_ECOSYSTEM = path.join(HUB_ROOT, "ecosystem.config.cjs");

const BUILD_DIR = path.join(HUB_ROOT, "build");
const BUILD_DB_MIGRATIONS = path.join(BUILD_DIR, "db", "migrations");
const BUILD_WWW = path.join(BUILD_DIR, "www");

async function removeDir(dir) {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const realPath = await fs.promises.realpath(srcPath);
      const stat = await fs.promises.stat(realPath);
      if (stat.isDirectory()) {
        await copyDir(realPath, destPath);
      } else {
        await ensureDir(path.dirname(destPath));
        await fs.promises.copyFile(realPath, destPath);
      }
    } else {
      await ensureDir(path.dirname(destPath));
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function copyFileIfExists(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }

  await ensureDir(path.dirname(dest));
  await fs.promises.copyFile(src, dest);
  return true;
}

function assertExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`[copy] ${label} not found: ${targetPath}`);
  }
}

async function generateProdPackageJson(src, dest) {
  const raw = await fs.promises.readFile(src, "utf-8");
  const pkg = JSON.parse(raw);

  const prodPkg = {
    name: pkg.name,
    version: pkg.version,
    private: pkg.private ?? true,
    type: pkg.type,
    main: pkg.main,
    dependencies: pkg.dependencies || {},
    optionalDependencies: pkg.optionalDependencies || {},
  };

  if (pkg.engines) {
    prodPkg.engines = pkg.engines;
  }

  // 只保留生产运行需要的脚本
  if (pkg.scripts) {
    const allowedScripts = ["db:migrate"];
    const scripts = {};

    for (const key of allowedScripts) {
      if (pkg.scripts[key]) {
        scripts[key] = pkg.scripts[key];
      }
    }

    if (Object.keys(scripts).length > 0) {
      prodPkg.scripts = scripts;
    }
  }

  await fs.promises.writeFile(dest, JSON.stringify(prodPkg, null, 2));
}

async function main() {
  assertExists(SERVER_DIST, "server dist");
  assertExists(WEB_DIST, "web dist");
  assertExists(SERVER_PACKAGE_JSON, "server package.json");
  assertExists(HUB_ECOSYSTEM, "ecosystem config");

  await removeDir(BUILD_DIR);
  await ensureDir(BUILD_DIR);

  // 1. server/dist -> build/dist
  await copyDir(SERVER_DIST, BUILD_DIR);

  // 2. web/dist/hub-web -> build/www
  await copyDir(WEB_DIST, BUILD_WWW);

  // 3. server/src/db/migrations -> build/db/migrations
  await copyDir(SERVER_DB_MIGRATIONS, BUILD_DB_MIGRATIONS);

  // 4. generate production package.json : server/package.json -> build/package.json
  await generateProdPackageJson(
    SERVER_PACKAGE_JSON,
    path.join(BUILD_DIR, "package.json"),
  );

  // 5. server/package-lock.json -> build/package-lock.json
  await copyFileIfExists(
    SERVER_PACKAGE_LOCK,
    path.join(BUILD_DIR, "package-lock.json"),
  );

  // 6. server/.env.production -> build/.env.production
  await copyFileIfExists(
    SERVER_ENV_PROD,
    path.join(BUILD_DIR, ".env.production"),
  );

  // 7. hub/ecosystem.config.cjs -> build/ecosystem.config.cjs
  await copyFileIfExists(
    HUB_ECOSYSTEM,
    path.join(BUILD_DIR, "ecosystem.config.cjs"),
  );

  console.log(`[copy] server dist  -> ${BUILD_DIR}`);
  console.log(`[copy] web dist     -> ${BUILD_WWW}`);
  console.log(
    `[copy] web entry    -> ${path.join(BUILD_WWW, "browser", "index.html")}`,
  );
  console.log(`[copy] package/env/ecosystem assembled into ${BUILD_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
