/**
 * build-all.js
 * 负责执行完整的构建流程，包括构建 web 和 server 端，以及准备 build 目录
 * 主要步骤：
 *  1. 构建 web 端：执行 npm run build:web，生成 web/dist 目录
 *  2. 构建 server 端：执行 npm run build:server，生成 server/dist 目录
 *  3. 执行 copy.js 脚本，将构建产物和必要的配置文件复制到 build 目录
 * 注意：
 *  - 该脚本假设 web 和 server 的构建命令分别为 npm run build:web 和 npm run build:server，并且构建产物分别位于 web/dist 和 server/dist
 *  - 该脚本会调用 copy.js 来准备 build 目录，确保 build 目录包含必要的文件和配置，为后续的打包和部署做好准备
 *  - 该脚本的目的是提供一个一键式的构建流程，简化开发和部署过程，确保每次构建都包含最新的代码和配置
 * 
 */

const { execSync } = require("node:child_process");
const path = require("node:path");

const HUB_ROOT = path.resolve(__dirname, "..");

function run(command) {
  console.log(`[build] ${command}`);
  execSync(command, {
    cwd: HUB_ROOT,
    stdio: "inherit",
  });
}

function main() {
  run("npm run build:web");
  run("npm run build:server");
  run("npm run copy");
  console.log("[build] done");
}

main();
