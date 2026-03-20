/**
 * package-release.js
 * 
 * 负责将 build 目录打包成一个压缩包，准备发布到生产环境
 * 主要步骤：
 *  1. 确保 build 目录存在，包含之前 copy.js 准备好的构建产物和配置文件
 *  2. 使用 tar 命令将 build 目录打包成 ngm-hub.tar.gz，放在项目根目录下
 *  注意：
 *   - 该脚本假设 build 目录已经准备好，包含必要的文件和配置
 *   - 生成的压缩包 ngm-hub.tar.gz 将包含 build 目录下的所有内容，保持目录结构不变
 *   - 该脚本的目的是为后续的部署步骤准备好一个包含所有必要文件和配置的压缩包，简化部署过程，确保生产环境部署时只需要上传一个压缩包即可完成部署
 */


const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const HUB_ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(HUB_ROOT, "build");
const ARCHIVE_NAME = "ngm-hub.tar.gz";
const ARCHIVE_PATH = path.join(HUB_ROOT, ARCHIVE_NAME);

function ensureBuildExists() {
  if (!fs.existsSync(BUILD_DIR)) {
    throw new Error(`build directory not found: ${BUILD_DIR}`);
  }
}

function run(command) {
  console.log(`[package] ${command}`);
  execSync(command, {
    cwd: HUB_ROOT,
    stdio: "inherit",
  });
}

function main() {
  ensureBuildExists();

  if (fs.existsSync(ARCHIVE_PATH)) {
    fs.rmSync(ARCHIVE_PATH, { force: true });
  }

  const isWin = process.platform === "win32";

  if (isWin) {
    // Windows 下优先复用 tar
    const tarCmd = `tar -czf "${ARCHIVE_PATH}" -C "${BUILD_DIR}" .`;
    run(tarCmd);
  } else {
    const tarCmd = `tar -czf "${ARCHIVE_PATH}" -C "${BUILD_DIR}" .`;
    run(tarCmd);
  }

  console.log(`[package] archive created: ${ARCHIVE_PATH}`);
}

main();
